import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  getCountFromServer,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function getKelasList() {
  try {
    const colRef = collection(db, "kelas")
    const snap = await getDocs(colRef)
    const list = []
    for (const docSnap of snap.docs) {
      const data = docSnap.data()
      // Hitung jumlah murid di kelas ini
      let jumlahMurid = 0
      try {
        const muridQuery = query(collection(db, "murid"), where("kelasId", "==", docSnap.id))
        const countSnap = await getCountFromServer(muridQuery)
        jumlahMurid = countSnap.data().count
      } catch {
        jumlahMurid = 0
      }

      list.push({
        id: docSnap.id,
        ...data,
        jumlahMurid,
      })
    }

    // Urutkan berdasarkan tingkat lalu nama kelas
    return list.sort((a, b) => {
      if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat
      return a.nama.localeCompare(b.nama)
    })
  } catch (err) {
    // Jika user belum login dan firestore rules membatasi, fallback return array kosong tanpa error
    return []
  }
}

export async function getKelasById(id) {
  const ref = doc(db, "kelas", id)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() }
  }
  return null
}

export async function createKelas(data) {
  // Cek nama kelas unik dalam tahun ajaran yang sama
  const q = query(
    collection(db, "kelas"),
    where("nama", "==", data.nama.trim()),
    where("tahunAjaran", "==", data.tahunAjaran.trim())
  )
  const existing = await getDocs(q)
  if (!existing.empty) {
    throw new Error(`Kelas ${data.nama} untuk tahun ajaran ${data.tahunAjaran} sudah ada.`)
  }

  return await addDoc(collection(db, "kelas"), {
    nama: data.nama.trim(),
    tingkat: Number(data.tingkat),
    tahunAjaran: data.tahunAjaran.trim(),
    keterangan: data.keterangan ? data.keterangan.trim() : "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateKelas(id, data) {
  const ref = doc(db, "kelas", id)
  return await updateDoc(ref, {
    nama: data.nama.trim(),
    tingkat: Number(data.tingkat),
    tahunAjaran: data.tahunAjaran.trim(),
    keterangan: data.keterangan ? data.keterangan.trim() : "",
    updatedAt: serverTimestamp(),
  })
}

export async function deleteKelas(id) {
  // Cek apakah masih ada murid di kelas ini
  const muridQuery = query(collection(db, "murid"), where("kelasId", "==", id))
  const countSnap = await getCountFromServer(muridQuery)
  if (countSnap.data().count > 0) {
    throw new Error("Kelas tidak dapat dihapus karena masih memiliki murid terdaftar.")
  }

  return await deleteDoc(doc(db, "kelas", id))
}

