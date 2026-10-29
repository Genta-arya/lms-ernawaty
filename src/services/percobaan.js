import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function submitPercobaan(data) {
  return await addDoc(collection(db, "percobaan"), {
    ...data,
    selesaiAt: serverTimestamp(),
  })
}

export async function getPercobaanById(id) {
  const ref = doc(db, "percobaan", id)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() }
  }
  return null
}

export async function getPercobaanByMurid(uid) {
  const q = query(collection(db, "percobaan"), where("uid", "==", uid))
  const snap = await getDocs(q)
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return list.sort((a, b) => {
    const tA = a.selesaiAt?.seconds || 0
    const tB = b.selesaiAt?.seconds || 0
    return tB - tA
  })
}

export async function getPercobaanByKuis(kuisId) {
  const q = query(collection(db, "percobaan"), where("kuisId", "==", kuisId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function deletePercobaan(id) {
  return await deleteDoc(doc(db, "percobaan", id))
}

/**
 * Mengambil papan peringkat (leaderboard) kuis per hari ini
 * Kriteria:
 * - Hanya percobaan yang lulus (lulus == true atau skor >= nilaiLulus)
 * - Dikerjakan pada hari ini (00:00 - 23:59 waktu lokal)
 * - Diurutkan berdasarkan skor tertinggi, durasi pengerjaan tercepat
 * - Satu murid satu entri terbaik (skor tertinggi murid tersebut hari ini)
 */
export async function getLeaderboardHarian({ kuisId = null, materiId = null, limitCount = 10 } = {}) {
  try {
    let q = collection(db, "percobaan")
    if (kuisId) {
      q = query(collection(db, "percobaan"), where("kuisId", "==", kuisId))
    } else if (materiId) {
      q = query(collection(db, "percobaan"), where("materiId", "==", materiId))
    }

    const snap = await getDocs(q)
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Tentukan rentang waktu hari ini (00:00:00 sampai 23:59:59 waktu lokal)
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000

    // Filter percobaan hari ini yang lulus
    const filteredToday = list.filter((p) => {
      if (!p.lulus) return false

      let timeMillis = 0
      if (p.selesaiAt?.toMillis) {
        timeMillis = p.selesaiAt.toMillis()
      } else if (p.selesaiAt?.seconds) {
        timeMillis = p.selesaiAt.seconds * 1000
      } else if (typeof p.selesaiAt === "string") {
        timeMillis = new Date(p.selesaiAt).getTime()
      }

      return timeMillis >= startOfToday && timeMillis < endOfToday
    })

    // Ambil data murid untuk melengkapi nama & foto profil jika belum ada di dokumen percobaan
    // Ambil percobaan terbaik per siswa (skor tertinggi, durasi terkecil)
    const bestPerStudent = new Map()

    filteredToday.forEach((p) => {
      const studentId = p.uid || p.nisn || p.id
      const current = bestPerStudent.get(studentId)

      if (!current) {
        bestPerStudent.set(studentId, p)
      } else {
        // Bandingkan skor
        if (p.skor > current.skor) {
          bestPerStudent.set(studentId, p)
        } else if (p.skor === current.skor) {
          // Jika skor sama, bandingkan durasi (yang lebih cepat menang)
          const durP = p.durasiDetik || 99999
          const durCurrent = current.durasiDetik || 99999
          if (durP < durCurrent) {
            bestPerStudent.set(studentId, p)
          }
        }
      }
    })

    const ranked = Array.from(bestPerStudent.values())

    // Urutkan peringkat: Skor tertinggi -> Durasi pengerjaan tercepat
    ranked.sort((a, b) => {
      if (b.skor !== a.skor) {
        return b.skor - a.skor
      }
      const durA = a.durasiDetik || 99999
      const durB = b.durasiDetik || 99999
      return durA - durB
    })

    return ranked.slice(0, limitCount)
  } catch (err) {
    console.error("Gagal mengambil leaderboard harian:", err)
    return []
  }
}

