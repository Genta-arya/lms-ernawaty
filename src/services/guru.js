import { doc, getDoc, getDocs, collection, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

/**
 * Mengambil profil guru berdasarkan UID
 */
export async function getGuruProfile(uid) {
  const ref = doc(db, "guru", uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { uid, ...snap.data() }
  }
  return null
}

/**
 * Mengambil data guru utama (Ibu Ernawaty) untuk ditampilkan di portal siswa
 */
export async function getGuruUtama() {
  try {
    const colRef = collection(db, "guru")
    const snap = await getDocs(colRef)
    if (!snap.empty) {
      // Prioritaskan guru yang sudah memiliki mapel atau data terisi
      const docs = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
      const guruAktif = docs.find((g) => g.mapel) || docs[0]
      return guruAktif
    }
  } catch (err) {
    console.warn("Gagal mengambil data guru utama:", err)
  }
  return { nama: "Ernawaty", mapel: "Bahasa Inggris" }
}

/**
 * Update profil guru (menggunakan setDoc merge agar aman jika dokumen belum ada)
 */
export async function updateGuruProfile(uid, data) {
  const ref = doc(db, "guru", uid)
  return await setDoc(
    ref,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

/**
 * Mengambil informasi sekolah
 */
export async function getSekolahInfo() {
  const ref = doc(db, "sekolah", "utama")
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return snap.data()
  }
  return { nama: "SMPN 3 Ketapang", alamat: "Ketapang, Kalimantan Barat" }
}
