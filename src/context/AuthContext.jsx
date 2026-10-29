import React, { createContext, useContext, useEffect, useState } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db, googleProvider } from "@/lib/firebase"
import { checkAutoActivation } from "@/services/klaim"

const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function isUserInAppBrowser() {
  const ua = navigator.userAgent || navigator.vendor || window.opera
  return /FBAN|FBAV|Instagram|Line|WhatsApp|TikTok|Twitter|MicroMessenger/i.test(ua)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [role, setRole] = useState(null) // 'guru' | 'murid' | 'unactivated' | null
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function checkUserRole(user) {
    if (!user) {
      setRole(null)
      setProfileData(null)
      return null
    }

    try {
      // 1. Cek apakah akun adalah Guru
      const guruRef = doc(db, "guru", user.uid)
      const guruSnap = await getDoc(guruRef)
      if (guruSnap.exists()) {
        setRole("guru")
        setProfileData({ uid: user.uid, ...guruSnap.data() })
        return "guru"
      }

      // 2. Cek apakah akun adalah Murid yang sudah terhubung (akunMurid)
      const akunMuridRef = doc(db, "akunMurid", user.uid)
      const akunMuridSnap = await getDoc(akunMuridRef)
      if (akunMuridSnap.exists()) {
        const akunData = akunMuridSnap.data()
        // Ambil data detail dari murid/{nisn}
        const muridRef = doc(db, "murid", akunData.nisn)
        const muridSnap = await getDoc(muridRef)
        const detailMurid = muridSnap.exists() ? muridSnap.data() : {}

        // Ambil nama kelas asli & tingkat jika kelasId tersedia
        let kelasNama = detailMurid.kelasNama || ""
        let tingkat = detailMurid.tingkat || null
        if (detailMurid.kelasId) {
          try {
            const kRef = doc(db, "kelas", detailMurid.kelasId)
            const kSnap = await getDoc(kRef)
            if (kSnap.exists()) {
              const kData = kSnap.data()
              if (!kelasNama) kelasNama = `Kelas ${kData.nama}`
              tingkat = kData.tingkat || null
            }
          } catch (e) {
            console.warn("Gagal resolve kelas:", e)
          }
        }

        setRole("murid")
        setProfileData({
          uid: user.uid,
          nisn: akunData.nisn,
          ...detailMurid,
          fotoUrl: detailMurid.fotoUrl || user.photoURL || null,
          kelasNama: kelasNama || detailMurid.kelasNama || "",
          tingkat: tingkat || detailMurid.tingkat || null,
        })
        return "murid"
      }

      // 3. Jika login via Google dan belum ada di akunMurid, coba Jalur A (auto aktivasi jika email cocok)
      if (user.email) {
        const autoActivated = await checkAutoActivation(user)
        if (autoActivated) {
          setRole("murid")
          setProfileData({
            uid: user.uid,
            ...autoActivated,
          })
          return "murid"
        }
      }

      // 4. Pengguna Google terautentikasi tapi belum terhubung
      setRole("unactivated")
      setProfileData(null)
      return "unactivated"
    } catch (err) {
      console.error("Gagal memeriksa role pengguna:", err)
      setRole("unactivated")
      return "unactivated"
    }
  }

  useEffect(() => {
    // Tangani hasil kembalian dari login redirect di tab yang sama
    async function handleRedirect() {
      try {
        const result = await getRedirectResult(auth)
        if (result?.user) {
          await checkUserRole(result.user)
        }
      } catch (err) {
        console.error("Gagal memproses redirect login:", err)
      }
    }
    handleRedirect()

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        await checkUserRole(user)
      } else {
        setRole(null)
        setProfileData(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Fungsi reload status auth (berguna setelah klaim disetujui atau aktivasi berhasil)
  async function refreshUserRole() {
    if (currentUser) {
      setLoading(true)
      const newRole = await checkUserRole(currentUser)
      setLoading(false)
      return newRole
    }
    return null
  }

  // Login Guru
  async function loginGuru(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    if (cred.user) {
      setLoading(true)
      const userRole = await checkUserRole(cred.user)
      setLoading(false)
      return { user: cred.user, role: userRole }
    }
    return cred
  }

  // Login Murid via Google (Popup mulus di desktop & in-tab popup di mobile)
  async function loginMuridGoogle() {
    let cred
    try {
      cred = await signInWithPopup(auth, googleProvider)
    } catch (error) {
      if (
        error.code === "auth/popup-blocked" ||
        error.code === "auth/cancelled-popup-request"
      ) {
        return await signInWithRedirect(auth, googleProvider)
      }
      throw error
    }

    if (cred?.user) {
      setLoading(true)
      const userRole = await checkUserRole(cred.user)
      setLoading(false)
      return { user: cred.user, role: userRole }
    }
    return cred
  }

  // Logout
  function logout() {
    setRole(null)
    setProfileData(null)
    return signOut(auth)
  }

  // Reset Password Guru
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email)
  }

  // Update nama lokal instan di state tanpa full refetch
  function updateLocalProfileNama(newNama) {
    setProfileData((prev) => (prev ? { ...prev, nama: newNama } : prev))
    if (currentUser) {
      setCurrentUser((prev) => (prev ? { ...prev, displayName: newNama } : prev))
    }
  }

  // Update foto profil lokal instan di state tanpa full refetch
  function updateLocalProfileFoto(newFotoUrl) {
    setProfileData((prev) => (prev ? { ...prev, fotoUrl: newFotoUrl } : prev))
    if (currentUser) {
      setCurrentUser((prev) => (prev ? { ...prev, photoURL: newFotoUrl } : prev))
    }
  }

  const value = {
    currentUser,
    role,
    profileData,
    loading,
    refreshUserRole,
    updateLocalProfileNama,
    updateLocalProfileFoto,
    loginGuru,
    loginMuridGoogle,
    logout,
    resetPassword,
    isInAppBrowser: isUserInAppBrowser(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
