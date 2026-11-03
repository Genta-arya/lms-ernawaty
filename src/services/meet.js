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
 * Mengambil token Agora RTC dari serverless function
 */
export async function fetchAgoraToken(channelName, uid = 0, role = "publisher") {
  const res = await fetch("/api/agora-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelName, uid, role }),
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
  waktuMulai, // ISO string atau timestamp
  guruUid,
  guruNama,
}) {
  if (!judul || !kelasId || !guruUid) {
    throw new Error("Judul, kelas sasaran, dan guru pengampu wajib diisi.")
  }

  // Generate channelName unik berbasis alphanumeric tanpa karakter ilegal
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
