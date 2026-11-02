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
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      jumlahMurid: 0,
    }))

    // Urutkan berdasarkan tingkat lalu nama kelas
    return list.sort((a, b) => {
      if (a.tingkat !== b.tingkat) return (a.tingkat || 0) - (b.tingkat || 0)
      return (a.nama || "").localeCompare(b.nama || "")
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


export async function getDetailKelasDanTeman(kelasId) {
  if (!kelasId) return { kelas: null, teman: [] }
  const [kelasData, allMuridSnap, allPercobaanSnap, allTugasSubSnap, allAkunSnap] = await Promise.all([
    getKelasById(kelasId),
    getDocs(query(collection(db, "murid"), where("kelasId", "==", kelasId))),
    getDocs(collection(db, "percobaan")),
    getDocs(collection(db, "pengumpulanTugas")),
    getDocs(collection(db, "akunMurid")),
  ])

  // Mapping akun murid untuk foto profil & uid
  const akunMap = new Map()
  allAkunSnap.forEach((d) => {
    const data = d.data()
    if (data.nisn) {
      akunMap.set(data.nisn, { uid: d.id, ...data })
    }
  })

  const muridList = allMuridSnap.docs.map((d) => {
    const data = d.data()
    const linkedAkun = akunMap.get(d.id)
    return {
      nisn: d.id,
      ...data,
      uid: linkedAkun?.uid || data.uid || null,
      fotoUrl: linkedAkun?.fotoUrl || data.fotoUrl || null,
    }
  })

  // Skor kuis map (key: nisn atau uid)
  const skorKuisMap = new Map()
  allPercobaanSnap.forEach((docSnap) => {
    const p = docSnap.data()
    const key = p.nisn || p.uid
    if (!key) return
    if (!skorKuisMap.has(key)) {
      skorKuisMap.set(key, { totalSkor: 0, count: 0, maxSkor: 0, list: [] })
    }
    const item = skorKuisMap.get(key)
    const skorNum = Number(p.skor) || 0
    item.totalSkor += skorNum
    item.count += 1
    if (skorNum > item.maxSkor) item.maxSkor = skorNum
    item.list.push({ kuisJudul: p.kuisJudul || "Kuis", skor: skorNum, tanggal: p.selesaiPada })
  })

  // Nilai tugas map (key: nisn atau uid)
  const nilaiTugasMap = new Map()
  allTugasSubSnap.forEach((docSnap) => {
    const sub = docSnap.data()
    const key = sub.nisn || sub.uid
    if (!key) return
    if (sub.nilai !== undefined && sub.nilai !== null) {
      if (!nilaiTugasMap.has(key)) {
        nilaiTugasMap.set(key, { totalNilai: 0, count: 0, list: [] })
      }
      const item = nilaiTugasMap.get(key)
      const val = Number(sub.nilai) || 0
      item.totalNilai += val
      item.count += 1
      item.list.push({ tugasJudul: sub.tugasJudul || "Tugas", nilai: val, dinilaiPada: sub.dinilaiPada })
    }
  })

  const temanLengkap = muridList.map((m) => {
    const kuisInfo = (m.nisn && skorKuisMap.get(m.nisn)) || (m.uid && skorKuisMap.get(m.uid)) || { totalSkor: 0, count: 0, maxSkor: 0, list: [] }
    const tugasInfo = (m.nisn && nilaiTugasMap.get(m.nisn)) || (m.uid && nilaiTugasMap.get(m.uid)) || { totalNilai: 0, count: 0, list: [] }

    const avgKuis = kuisInfo.count > 0 ? Math.round(kuisInfo.totalSkor / kuisInfo.count) : 0
    const avgTugas = tugasInfo.count > 0 ? Math.round(tugasInfo.totalNilai / tugasInfo.count) : 0

    return {
      ...m,
      avgKuis,
      maxKuis: kuisInfo.maxSkor,
      kuisCount: kuisInfo.count,
      kuisList: kuisInfo.list,
      avgTugas,
      tugasCount: tugasInfo.count,
      tugasList: tugasInfo.list,
    }
  })

  temanLengkap.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""))

  return {
    kelas: kelasData,
    teman: temanLengkap,
  }
}
