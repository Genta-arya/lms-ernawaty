import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

const COLLECTION_NAME = "sesiMeet"
const AGORA_APP_ID = "5960c48ec498439798df7c0d1249ae4d"

/**
 * Mengambil token Agora RTC dari serverless function menggunakan String userAccount (Nama Peserta)
 */
export async function fetchAgoraToken(channelName, userAccount = "Peserta", role = "publisher") {
  const res = await fetch("/api/agora-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelName, userAccount, role }),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error || `Server token error (${res.status})`)
  }
  const data = await res.json()
  if (!data.token) {
    throw new Error("Token Agora kosong atau gagal dibuat oleh server.")
  }
  return data
}

/**
 * Membuat sesi meet baru (oleh guru)
 */
export async function createSesiMeet({
  judul,
  deskripsi = "",
  kelasId,
  kelasNama,
  tingkat = null,
  waktuMulai,
  guruUid,
  guruNama,
}) {
  if (!judul || !kelasId || !guruUid) {
    throw new Error("Judul, kelas sasaran, dan guru pengampu wajib diisi.")
  }

  const randomStr = Math.random().toString(36).substring(2, 8)
  const channelName = `meet_${kelasId.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}_${randomStr}`

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    judul: judul.trim(),
    deskripsi: deskripsi?.trim() || "",
    kelasId,
    kelasNama: kelasNama || "Semua Kelas",
    tingkat: tingkat || null,
    waktuMulai: waktuMulai ? new Date(waktuMulai) : new Date(),
    status: "terjadwal", // "terjadwal" | "berlangsung" | "selesai"
    channelName,
    appId: AGORA_APP_ID,
    guruUid,
    guruNama: guruNama || "Guru Pengajar",
    pesertaAktifCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return { id: docRef.id, channelName }
}

/**
 * Mengubah status sesi meet (misal mulai sesi atau akhiri sesi)
 */
export async function updateStatusSesiMeet(sesiId, status) {
  if (!sesiId) return
  const docRef = doc(db, COLLECTION_NAME, sesiId)
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
    ...(status === "selesai" ? { selesaiAt: serverTimestamp() } : {}),
  })
}

/**
 * Hapus sesi meet
 */
export async function deleteSesiMeet(sesiId) {
  if (!sesiId) return
  const docRef = doc(db, COLLECTION_NAME, sesiId)
  await deleteDoc(docRef)
}

/**
 * Berlangganan sesi meet untuk kelas murid (hanya yang aktif atau terjadwal hari ini)
 */
export function subscribeSesiMeetByKelas(kelasId, callback) {
  if (!kelasId) {
    callback([])
    return () => {}
  }

  const q = query(
    collection(db, COLLECTION_NAME),
    where("kelasId", "in", [kelasId, "semua"])
  )

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      items.sort((a, b) => {
        if (a.status === "berlangsung" && b.status !== "berlangsung") return -1
        if (b.status === "berlangsung" && a.status !== "berlangsung") return 1
        const timeA = a.waktuMulai?.toDate ? a.waktuMulai.toDate().getTime() : new Date(a.waktuMulai || 0).getTime()
        const timeB = b.waktuMulai?.toDate ? b.waktuMulai.toDate().getTime() : new Date(b.waktuMulai || 0).getTime()
        return timeA - timeB
      })
      callback(items)
    },
    (err) => {
      console.warn("Gagal berlangganan sesi meet murid:", err)
      callback([])
    }
  )
}

/**
 * Berlangganan seluruh sesi meet untuk guru
 */
export function subscribeAllSesiMeetGuru(callback) {
  const q = query(collection(db, COLLECTION_NAME))

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      items.sort((a, b) => {
        if (a.status === "berlangsung" && b.status !== "berlangsung") return -1
        if (b.status === "berlangsung" && a.status !== "berlangsung") return 1
        const timeA = a.waktuMulai?.toDate ? a.waktuMulai.toDate().getTime() : new Date(a.waktuMulai || 0).getTime()
        const timeB = b.waktuMulai?.toDate ? b.waktuMulai.toDate().getTime() : new Date(b.waktuMulai || 0).getTime()
        return timeB - timeA
      })
      callback(items)
    },
    (err) => {
      console.warn("Gagal berlangganan sesi meet guru:", err)
      callback([])
    }
  )
}


/**
 * Berlangganan status kontrol realtime (screen sharing, mute, kick) untuk channel sesi meet
 */
export function subscribeMeetControls(channelName, callback) {
  if (!channelName) return () => {}
  const docRef = doc(db, "meetControls", channelName)
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data())
      } else {
        callback({ activeSharer: null, mutedUsers: [], kickedUsers: [] })
      }
    },
    (err) => {
      console.warn("Gagal listen meet controls:", err)
      callback({ activeSharer: null, mutedUsers: [], kickedUsers: [] })
    }
  )
}

/**
 * Set status screen sharer aktif di channel
 */
export async function setActiveScreenSharer(channelName, userAccount) {
  if (!channelName) return
  const docRef = doc(db, "meetControls", channelName)
  await updateDoc(docRef, {
    activeSharer: userAccount || null,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    // Jika belum ada dokumennya, set baru
    const { setDoc } = await import("firebase/firestore")
    await setDoc(docRef, {
      channelName,
      activeSharer: userAccount || null,
      mutedUsers: [],
      kickedUsers: [],
      updatedAt: serverTimestamp(),
    })
  })
}

/**
 * Guru melakukan force mute kepada peserta tertentu (trigger signal sekali lewat timestamp)
 */
export async function forceMuteUser(channelName, targetUserAccount) {
  if (!channelName || !targetUserAccount) return
  const docRef = doc(db, "meetControls", channelName)
  const { setDoc } = await import("firebase/firestore")
  await updateDoc(docRef, {
    lastMutedUser: { user: targetUserAccount, at: Date.now() },
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    await setDoc(docRef, {
      channelName,
      activeSharer: null,
      lastMutedUser: { user: targetUserAccount, at: Date.now() },
      kickedUsers: {},
      updatedAt: serverTimestamp(),
    })
  })
}

/**
 * Guru melakukan kick (keluarkan) peserta dari sesi meet dengan timestamp timeout (misal 15 detik)
 * Setelah 15 detik, siswa bisa kembali bergabung.
 */
export async function forceKickUser(channelName, targetUserAccount) {
  if (!channelName || !targetUserAccount) return
  const docRef = doc(db, "meetControls", channelName)
  const { setDoc } = await import("firebase/firestore")
  const kickUntil = Date.now() + 15000 // Diblokir selama 15 detik, setelah itu dapat masuk kembali

  await updateDoc(docRef, {
    [`kickedUsers.${targetUserAccount}`]: kickUntil,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    await setDoc(docRef, {
      channelName,
      activeSharer: null,
      lastMutedUser: null,
      kickedUsers: { [targetUserAccount]: kickUntil },
      updatedAt: serverTimestamp(),
    })
  })
}

/**
 * Guru melakukan force mute kepada semua murid sekaligus
 */
export async function forceMuteAllUsers(channelName) {
  if (!channelName) return
  const docRef = doc(db, "meetControls", channelName)
  const { setDoc } = await import("firebase/firestore")
  await updateDoc(docRef, {
    muteAllTrigger: Date.now(),
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    await setDoc(docRef, {
      channelName,
      activeSharer: null,
      muteAllTrigger: Date.now(),
      updatedAt: serverTimestamp(),
    })
  })
}

/**
 * Guru meminta peserta tertentu untuk menyalakan mikrofon (minta unmute)
 */
export async function askUserToUnmute(channelName, targetUserAccount) {
  if (!channelName || !targetUserAccount) return
  const docRef = doc(db, "meetControls", channelName)
  const { setDoc } = await import("firebase/firestore")
  await updateDoc(docRef, {
    askUnmuteUser: { user: targetUserAccount, at: Date.now() },
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    await setDoc(docRef, {
      channelName,
      activeSharer: null,
      askUnmuteUser: { user: targetUserAccount, at: Date.now() },
      updatedAt: serverTimestamp(),
    })
  })
}

/**
 * Mengubah status angkat tangan (raise hand) peserta
 */
export async function toggleRaiseHand(channelName, userAccount, isRaised) {
  if (!channelName || !userAccount) return
  const docRef = doc(db, "meetControls", channelName)
  const { setDoc } = await import("firebase/firestore")
  await updateDoc(docRef, {
    [`raisedHands.${userAccount}`]: isRaised ? Date.now() : null,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    await setDoc(docRef, {
      channelName,
      raisedHands: isRaised ? { [userAccount]: Date.now() } : {},
      updatedAt: serverTimestamp(),
    })
  })
}

/**
 * Guru mengubah izin berbagi layar bagi murid (allow/disallow)
 */
export async function updateScreenSharePermission(channelName, allowStudents) {
  if (!channelName) return
  const docRef = doc(db, "meetControls", channelName)
  const { setDoc } = await import("firebase/firestore")
  await updateDoc(docRef, {
    allowStudentScreenShare: !!allowStudents,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    await setDoc(docRef, {
      channelName,
      allowStudentScreenShare: !!allowStudents,
      updatedAt: serverTimestamp(),
    })
  })
}

/**
 * Guru mengatur spotlight peserta tertentu untuk semua penonton
 */
export async function setSpotlightUser(channelName, userAccount) {
  if (!channelName) return
  const docRef = doc(db, "meetControls", channelName)
  const { setDoc } = await import("firebase/firestore")
  await updateDoc(docRef, {
    spotlightUser: userAccount || null,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    await setDoc(docRef, {
      channelName,
      spotlightUser: userAccount || null,
      updatedAt: serverTimestamp(),
    })
  })
}

/**
 * Mengirim pesan chat dalam meet
 */
export async function sendMeetMessage(channelName, { senderNama, senderRole, text }) {
  if (!channelName || !text?.trim()) return
  const colRef = collection(db, "meetControls", channelName, "messages")
  await addDoc(colRef, {
    senderNama,
    senderRole: senderRole || "murid",
    text: text.trim(),
    createdAt: serverTimestamp(),
  })
}

/**
 * Berlangganan pesan chat dalam meet
 */
export function subscribeMeetMessages(channelName, callback) {
  if (!channelName) return () => {}
  const colRef = collection(db, "meetControls", channelName, "messages")
  const q = query(colRef, orderBy("createdAt", "asc"), limit(100))
  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      callback(msgs)
    },
    (err) => {
      console.warn("Gagal listen meet messages:", err)
      callback([])
    }
  )
}

