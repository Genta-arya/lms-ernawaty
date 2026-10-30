import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { isMateriCocokTingkat } from "@/lib/utils"

/**
 * Mengambil daftar tugas.
 * @param {boolean} isGuru - Apakah pemanggil adalah guru (jika guru, lihat semua status termasuk draf)
 * @param {string|null} studentTingkat - Tingkat kelas siswa (misal "VIII")
 * @param {string|null} studentKelasId - ID spesifik dokumen kelas siswa (misal "kelasId123")
 */
export async function getTugasList(isGuru = false, studentTingkat = null, studentKelasId = null) {
  let q
  if (isGuru) {
    q = query(collection(db, "tugas"))
  } else {
    q = query(collection(db, "tugas"), where("status", "==", "terbit"))
  }

  const snap = await getDocs(q)
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

  // Filter untuk murid jika bukan guru
  let filtered = list
  if (!isGuru) {
    filtered = list.filter((t) => {
      // 1. Jika tugas menargetkan kelas-kelas tertentu secara spesifik (kelasIds)
      if (t.kelasIds && Array.isArray(t.kelasIds) && t.kelasIds.length > 0) {
        if (!studentKelasId) {
          // Jika murid belum terhubung ke kelasId, fallback cek tingkat jika cocok
          return studentTingkat ? isMateriCocokTingkat(t.tingkat, studentTingkat) : true
        }
        return t.kelasIds.includes(studentKelasId)
      }

      // 2. Jika tidak ada pembatasan kelas spesifik, gunakan filter tingkat (VII, VIII, IX)
      if (studentTingkat) {
        return isMateriCocokTingkat(t.tingkat, studentTingkat)
      }

      return true
    })
  }

  // Urutkan berdasarkan waktu pembuatan terbaru
  return filtered.sort((a, b) => {
    const tA = a.createdAt?.seconds || 0
    const tB = b.createdAt?.seconds || 0
    return tB - tA
  })
}

/**
 * Mengambil detail tugas berdasarkan ID
 */
export async function getTugasById(id) {
  if (!id) return null
  const ref = doc(db, "tugas", id)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() }
  }
  return null
}

/**
 * Membuat tugas baru
 */
export async function createTugas(data) {
  const { id: _, ...cleanData } = data
  return await addDoc(collection(db, "tugas"), {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Memperbarui tugas
 */
export async function updateTugas(id, data) {
  const ref = doc(db, "tugas", id)
  const { id: _, ...cleanData } = data
  return await setDoc(
    ref,
    {
      ...cleanData,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

/**
 * Menghapus tugas beserta seluruh pengumpulan terkait
 */
export async function deleteTugas(id) {
  // Hapus dokumen tugas
  await deleteDoc(doc(db, "tugas", id))

  // Bersihkan data pengumpulan tugas terkait
  try {
    const q = query(collection(db, "pengumpulanTugas"), where("tugasId", "==", id))
    const snap = await getDocs(q)
    const deletes = snap.docs.map((d) => deleteDoc(d.ref))
    await Promise.all(deletes)
  } catch (err) {
    console.warn("Gagal membersihkan pengumpulan tugas:", err)
  }
}

/**
 * Mengambil seluruh pengumpulan tugas untuk satu tugas tertentu (untuk Guru)
 */
export async function getPengumpulanByTugas(tugasId) {
  const q = query(collection(db, "pengumpulanTugas"), where("tugasId", "==", tugasId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Mengambil riwayat pengumpulan tugas oleh satu murid tertentu
 */
export async function getPengumpulanByMurid(uid) {
  const q = query(collection(db, "pengumpulanTugas"), where("uid", "==", uid))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Mengambil detail pengumpulan murid untuk tugas tertentu
 */
export async function getPengumpulanDetail(tugasId, uid) {
  if (!tugasId || !uid) return null
  const docId = `${tugasId}_${uid}`
  const ref = doc(db, "pengumpulanTugas", docId)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() }
  }
  return null
}

/**
 * Mengirimkan / memperbarui pengumpulan tugas oleh murid
 */
export async function submitPengumpulanTugas({
  tugasId,
  uid,
  nisn,
  namaMurid,
  kelasId,
  kelasNama,
  tautanDrive,
  catatanSiswa,
}) {
  // 1. Cek batas waktu tugas (deadline)
  const tugasRef = doc(db, "tugas", tugasId)
  const tugasSnap = await getDoc(tugasRef)
  if (tugasSnap.exists()) {
    const tData = tugasSnap.data()
    if (tData.deadline) {
      const deadlineDate = new Date(tData.deadline)
      if (!isNaN(deadlineDate.getTime()) && deadlineDate < new Date()) {
        throw new Error("Batas waktu pengumpulan tugas ini telah berakhir. Pengumpulan ditutup.")
      }
    }
  }

  const docId = `${tugasId}_${uid}`
  const ref = doc(db, "pengumpulanTugas", docId)

  // 2. Cek apakah tugas sudah dinilai
  const existingSnap = await getDoc(ref)
  const existingData = existingSnap.exists() ? existingSnap.data() : {}
  if (existingData.status === "dinilai" || existingData.nilai !== undefined) {
    throw new Error("Tugas sudah diperiksa dan dinilai oleh guru, sehingga tidak dapat diperbarui lagi.")
  }

  const payload = {
    tugasId,
    uid,
    nisn: nisn || "",
    namaMurid: namaMurid || "Siswa",
    kelasId: kelasId || null,
    kelasNama: kelasNama || "",
    tautanDrive: (tautanDrive || "").trim(),
    catatanSiswa: (catatanSiswa || "").trim(),
    status: "diserahkan",
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  return await setDoc(ref, payload, { merge: true })
}

/**
 * Guru memberikan nilai dan umpan balik pada pengumpulan tugas siswa
 */
export async function gradePengumpulanTugas(pengumpulanId, { nilai, catatanGuru }) {
  const ref = doc(db, "pengumpulanTugas", pengumpulanId)
  return await setDoc(
    ref,
    {
      nilai: Number(nilai),
      catatanGuru: (catatanGuru || "").trim(),
      status: "dinilai",
      gradedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

/**
 * Realtime subscription untuk menghitung jumlah tugas siswa yang sudah diunggah tapi belum dinilai
 * Mendukung filter pengumpulan yang belum dinilai (status != "dinilai")
 * @param {Function} callback - Menerima count integer
 * @returns {Function} Unsubscribe function
 */
export function subscribeTugasPerluNilaiCount(callback) {
  const colRef = collection(db, "pengumpulanTugas")
  return onSnapshot(
    colRef,
    (snap) => {
      // Hitung pengumpulan yang belum dinilai: status !== "dinilai" atau nilai == null
      const unrated = snap.docs.filter((d) => {
        const data = d.data()
        return data.status !== "dinilai" && data.nilai === undefined
      })
      callback(unrated.length)
    },
    (err) => {
      console.warn("Gagal realtime subscribe tugas belum dinilai count:", err)
      callback(0)
    }
  )
}


