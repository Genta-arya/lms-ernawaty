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


export async function getDetailKelasDanTeman(kelasId, fallbackProfile = {}) {
  try {
    let resolvedKelasId = kelasId || fallbackProfile?.kelasId || null
    let resolvedKelasNama = fallbackProfile?.kelasNama || ""

    // 1. Ambil data kelas jika kelasId tersedia
    let kelasData = null
    if (resolvedKelasId) {
      try {
        kelasData = await getKelasById(resolvedKelasId)
      } catch (e) {
        console.warn("Gagal getKelasById:", e)
      }
    }

    // Jika kelasData belum ada tapi ada kelasNama, coba cari kelas berdasarkan nama
    if (!kelasData && resolvedKelasNama) {
      try {
        const cleanName = resolvedKelasNama.replace(/^Kelas\s+/i, "").trim()
        const qK = query(collection(db, "kelas"), where("nama", "==", cleanName))
        const kSnap = await getDocs(qK)
        if (!kSnap.empty) {
          kelasData = { id: kSnap.docs[0].id, ...kSnap.docs[0].data() }
          resolvedKelasId = kelasData.id
        }
      } catch (e) {
        console.warn("Gagal cari kelas by nama:", e)
      }
    }

    // 2. Ambil daftar murid yang satu kelas
    let muridList = []
    try {
      if (resolvedKelasId) {
        const qMurid = query(collection(db, "murid"), where("kelasId", "==", resolvedKelasId))
        const mSnap = await getDocs(qMurid)
        muridList = mSnap.docs.map((d) => ({ nisn: d.id, ...d.data() }))
      }

      // Jika query kelasId tidak menghasilkan apa-apa atau belum ada kelasId, coba query berdasarkan kelasNama
      if (muridList.length === 0 && resolvedKelasNama) {
        const cleanName = resolvedKelasNama.replace(/^Kelas\s+/i, "").trim()
        const qNama = query(collection(db, "murid"), where("kelasNama", "==", cleanName))
        const mNamaSnap = await getDocs(qNama)
        if (!mNamaSnap.empty) {
          muridList = mNamaSnap.docs.map((d) => ({ nisn: d.id, ...d.data() }))
        }
      }

      // Jika masih kosong, coba ambil semua murid (jika security rules mengizinkan)
      if (muridList.length === 0) {
        const allSnap = await getDocs(collection(db, "murid"))
        if (!allSnap.empty) {
          const all = allSnap.docs.map((d) => ({ nisn: d.id, ...d.data() }))
          if (resolvedKelasId) {
            muridList = all.filter((m) => m.kelasId === resolvedKelasId)
          } else if (resolvedKelasNama) {
            const clean = resolvedKelasNama.toLowerCase().replace(/^kelas\s+/i, "").trim()
            muridList = all.filter((m) => (m.kelasNama || "").toLowerCase().includes(clean))
          }
        }
      }
    } catch (err) {
      console.warn("Gagal mengambil murid kelas dari Firestore murid:", err)
    }

    // Jika akun murid login saat ini belum masuk di list (karena rules hanya izinkan get miliknya sendiri),
    // pastikan data profilnya tetap tampil
    if (fallbackProfile?.nisn && !muridList.some((m) => m.nisn === fallbackProfile.nisn)) {
      muridList.push({
        nisn: fallbackProfile.nisn,
        nama: fallbackProfile.nama || "Saya",
        kelasId: resolvedKelasId,
        kelasNama: resolvedKelasNama,
        uid: fallbackProfile.uid,
        fotoUrl: fallbackProfile.fotoUrl,
      })
    }

    // 3. Ambil data akunMurid secara aman
    const akunMap = new Map()
    try {
      const allAkunSnap = await getDocs(collection(db, "akunMurid"))
      allAkunSnap.forEach((d) => {
        const data = d.data()
        if (data.nisn) akunMap.set(data.nisn, { uid: d.id, ...data })
      })
    } catch (e) {
      console.warn("Gagal load akunMurid:", e)
    }

    // Lengkapi foto & uid murid
    muridList = muridList.map((m) => {
      const linked = akunMap.get(m.nisn)
      return {
        ...m,
        uid: linked?.uid || m.uid || null,
        fotoUrl: linked?.fotoUrl || m.fotoUrl || null,
      }
    })

    // 4. Ambil percobaan kuis secara aman
    const skorKuisMap = new Map()
    try {
      const allPercobaanSnap = await getDocs(collection(db, "percobaan"))
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
    } catch (e) {
      console.warn("Gagal load percobaan untuk kelas:", e)
    }

    // 5. Ambil pengumpulan tugas secara aman
    const nilaiTugasMap = new Map()
    try {
      const allTugasSubSnap = await getDocs(collection(db, "pengumpulanTugas"))
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
    } catch (e) {
      console.warn("Gagal load pengumpulanTugas untuk kelas:", e)
    }

    // Gabungkan data
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
      kelas: kelasData || { nama: resolvedKelasNama || "Saya", tahunAjaran: "2024/2025" },
      teman: temanLengkap,
    }
  } catch (globalErr) {
    console.error("Error global getDetailKelasDanTeman:", globalErr)
    return {
      kelas: { nama: fallbackProfile?.kelasNama || "Saya", tahunAjaran: "2024/2025" },
      teman: [],
    }
  }
}
