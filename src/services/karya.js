import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getKelasList } from "@/services/kelas"

export const KATEGORI_KARYA = [
  "Slogan & Poster Edukasi",
  "Pantun Melayu",
  "Puisi Bebas",
  "Cerpen Inspiratif",
  "Teks Deskripsi Budaya",
]

/**
 * Mengambil peta ID Kelas -> "Kelas <Nama>"
 */
async function fetchKelasMap() {
  try {
    const list = await getKelasList()
    const map = {}
    list.forEach((k) => {
      map[k.id] = `Kelas ${k.nama}`
    })
    return map
  } catch {
    return {}
  }
}

function bersihkanKelas(rawKelas, map) {
  if (!rawKelas) return "Pelajar"
  const str = String(rawKelas).trim()
  if (map[str]) return map[str]
  if (str.startsWith("Kelas ")) {
    const id = str.replace("Kelas ", "").trim()
    if (map[id]) return map[id]
    if (id.length >= 15) return Object.values(map)[0] || "Kelas Murid"
    return str
  }
  if (str.length >= 15) {
    if (map[str]) return map[str]
    return Object.values(map)[0] || "Kelas Murid"
  }
  return str.startsWith("Kelas ") ? str : `Kelas ${str}`
}

/**
 * Mengambil daftar karya mading digital (urut terbaru)
 */
export async function getKaryaList() {
  try {
    const [snap, kMap] = await Promise.all([
      getDocs(collection(db, "karya")),
      fetchKelasMap(),
    ])
    const list = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        penulisKelas: bersihkanKelas(data.penulisKelas, kMap),
      }
    })
    // Sort in-memory berdasarkan createdAt terbaru
    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0)
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0)
      return timeB - timeA
    })
    return list
  } catch (err) {
    console.error("Gagal mengambil daftar karya:", err)
    return []
  }
}

/**
 * Mengambil karya terpopuler (skor: total likes + total komentar), dibatasi limit
 */
export async function getTopKaryaList(limitCount = 5) {
  try {
    const all = await getKaryaList()
    // Hitung interaksi: likeCount + (komentar.length || 0)
    all.sort((a, b) => {
      const scoreA = (a.likeCount || a.likes?.length || 0) + (a.komentar?.length || 0)
      const scoreB = (b.likeCount || b.likes?.length || 0) + (b.komentar?.length || 0)
      if (scoreB !== scoreA) {
        return scoreB - scoreA
      }
      // Jika skor sama, urutkan tanggal terbaru
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0)
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0)
      return timeB - timeA
    })
    return all.slice(0, limitCount)
  } catch (err) {
    console.error("Gagal mengambil top karya:", err)
    return []
  }
}

/**
 * Menerbitkan karya baru oleh siswa atau guru
 */
export async function createKarya(data) {
  const colRef = collection(db, "karya")
  return await addDoc(colRef, {
    judul: data.judul.trim(),
    isi: data.isi.trim(),
    kategori: data.kategori || "Pantun Melayu",
    penulisNama: data.penulisNama || "Siswa",
    penulisRole: data.penulisRole || "murid",
    penulisUid: data.penulisUid,
    penulisKelas: data.penulisKelas || "",
    penulisFoto: data.penulisFoto || null,
    likes: [], // array UID yang like
    likeCount: 0,
    komentar: [], // array objek komentar: { id, nama, role, teks, createdAt }
    createdAt: serverTimestamp(),
  })
}

/**
 * Toggle Like pada sebuah karya
 */
export async function toggleLikeKarya(karyaId, uid) {
  const ref = doc(db, "karya", karyaId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const data = snap.data()
  const likes = data.likes || []
  const hasLiked = likes.includes(uid)

  if (hasLiked) {
    await updateDoc(ref, {
      likes: arrayRemove(uid),
      likeCount: increment(-1),
    })
    return false
  } else {
    await updateDoc(ref, {
      likes: arrayUnion(uid),
      likeCount: increment(1),
    })
    return true
  }
}

/**
 * Menambahkan komentar ke karya (mendukung info kelas, badge peran, foto avatar, dan reply)
 */
export async function addKomentarKarya(
  karyaId,
  { penulisNama, penulisRole, penulisUid, penulisKelas = null, penulisFoto = null, teks, replyToId = null, replyToNama = null }
) {
  const ref = doc(db, "karya", karyaId)
  const newComment = {
    id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    penulisNama,
    penulisRole,
    penulisUid,
    penulisKelas: penulisKelas || null,
    penulisFoto: penulisFoto || null,
    teks: teks.trim(),
    replyToId: replyToId || null,
    replyToNama: replyToNama || null,
    likes: [],
    likeCount: 0,
    createdAt: new Date().toISOString(),
  }

  await updateDoc(ref, {
    komentar: arrayUnion(newComment),
  })

  return newComment
}

/**
 * Toggle Like pada sebuah komentar di dalam karya
 */
export async function toggleLikeKomentarKarya(karyaId, commentId, uid) {
  const ref = doc(db, "karya", karyaId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return false

  const data = snap.data()
  const komentar = data.komentar || []

  const updatedKomentar = komentar.map((kom) => {
    if (kom.id === commentId) {
      const currentLikes = kom.likes || []
      const hasLiked = currentLikes.includes(uid)
      const nextLikes = hasLiked
        ? currentLikes.filter((id) => id !== uid)
        : [...currentLikes, uid]
      return {
        ...kom,
        likes: nextLikes,
        likeCount: nextLikes.length,
      }
    }
    return kom
  })

  await updateDoc(ref, { komentar: updatedKomentar })
  return true
}

/**
 * Menghapus komentar dari karya
 */
export async function deleteKomentarKarya(karyaId, commentId) {
  const ref = doc(db, "karya", karyaId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const data = snap.data()
  const komentar = data.komentar || []
  const filtered = komentar.filter((k) => k.id !== commentId)

  await updateDoc(ref, { komentar: filtered })
}

/**
 * Menghapus karya (oleh pembuatnya atau guru)
 */
export async function deleteKarya(karyaId) {
  const ref = doc(db, "karya", karyaId)
  return await deleteDoc(ref)
}

