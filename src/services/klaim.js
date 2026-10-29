import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

/**
 * Cek apakah email Google cocok dengan salah satu data murid (Jalur A - Otomatis)
 */
export async function checkAutoActivation(user) {
  if (!user || !user.email) return null

  const q = query(collection(db, "murid"), where("email", "==", user.email.toLowerCase()))
  const snap = await getDocs(q)
  if (!snap.empty) {
    const muridDoc = snap.docs[0]
    const nisn = muridDoc.id

    // Buat akunMurid otomatis
    const akunRef = doc(db, "akunMurid", user.uid)
    await setDoc(akunRef, {
      nisn,
      email: user.email.toLowerCase(),
      aktivasiVia: "email",
      createdAt: serverTimestamp(),
    })

    return { nisn, ...muridDoc.data() }
  }

  return null
}

/**
 * Mengambil dokumen klaim murid berdasarkan UID
 */
export async function getKlaimByUid(uid) {
  const ref = doc(db, "klaim", uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { uid: snap.id, ...snap.data() }
  }
  return null
}

/**
 * Memeriksa apakah NISN sudah pernah digunakan oleh murid lain
 */
export async function checkNisnDuplicate(nisn, currentUid) {
  const cleanNisn = String(nisn).trim()
  if (!cleanNisn) return { isDuplicate: false }

  const nisnNum = Number(cleanNisn)
  const nisnQueries = [cleanNisn]
  if (!isNaN(nisnNum) && String(nisnNum) === cleanNisn) {
    nisnQueries.push(nisnNum)
  }

  try {
    // 1. Cek apakah sudah terdaftar di akunMurid (akun siswa yang sudah aktif)
    // Menggunakan query 'in' untuk mencocokkan string maupun number
    const qAkun = query(collection(db, "akunMurid"), where("nisn", "in", nisnQueries))
    const akunSnap = await getDocs(qAkun)

    if (!akunSnap.empty) {
      const isOther = akunSnap.docs.some((d) => d.id !== currentUid)
      return {
        isDuplicate: true,
        reason: isOther
          ? `NISN ${cleanNisn} sudah aktif digunakan oleh akun murid lain. Satu siswa hanya boleh memiliki 1 akun terdaftar.`
          : `NISN ${cleanNisn} sudah terdaftar pada akun Anda.`,
      }
    }

    // 2. Cek apakah sedang diajukan di klaim oleh akun lain dengan status 'menunggu'
    const qKlaim = query(
      collection(db, "klaim"),
      where("nisn", "in", nisnQueries),
      where("status", "==", "menunggu")
    )
    const klaimSnap = await getDocs(qKlaim)

    if (!klaimSnap.empty) {
      const isOther = klaimSnap.docs.some((d) => d.id !== currentUid)
      if (isOther) {
        return {
          isDuplicate: true,
          reason: `NISN ${cleanNisn} sedang menunggu verifikasi oleh akun murid lain. Periksa kembali NISN Anda.`,
        }
      }
    }

    return { isDuplicate: false }
  } catch (err) {
    console.error("Gagal memeriksa duplikasi NISN di Firestore:", err)
    return {
      isDuplicate: null,
      error: err,
      reason:
        err.code === "permission-denied"
          ? "Pengecekan NISN terhalang izin Firestore. Pastikan aturan firestore.rules terbaru sudah dipublikasikan di Firebase Console."
          : err.message || "Gagal memverifikasi keunikan NISN.",
    }
  }
}

/**
 * Mengirim permohonan klaim / aktivasi akun murid (Jalur B)
 */
export async function submitKlaim(user, nisn, nama, kelasId = null) {
  // Cek duplikasi NISN sebelum simpan
  const check = await checkNisnDuplicate(nisn, user.uid)
  if (check.isDuplicate) {
    throw new Error(check.reason)
  }

  const ref = doc(db, "klaim", user.uid)
  return await setDoc(
    ref,
    {
      nisn: String(nisn).trim(),
      nama: nama.trim(),
      email: user.email.toLowerCase(),
      kelasId: kelasId || null,
      status: "menunggu",
      catatan: null,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  )
}

/**
 * Guru mengambil daftar semua klaim yang berstatus 'menunggu'
 */
export async function getKlaimList() {
  const q = query(collection(db, "klaim"), where("status", "==", "menunggu"))
  const snap = await getDocs(q)
  const list = []

  // Ambil data kelas untuk label nama kelas
  const kelasSnap = await getDocs(collection(db, "kelas"))
  const kelasMap = new Map()
  kelasSnap.forEach((k) => kelasMap.set(k.id, k.data().nama))

  for (const d of snap.docs) {
    const data = d.data()
    // Cek apakah NISN sudah terdaftar di database murid
    const muridRef = doc(db, "murid", data.nisn)
    const muridSnap = await getDoc(muridRef)

    // Cek apakah NISN sudah pernah terhubung ke akun lain
    const qAkun = query(collection(db, "akunMurid"), where("nisn", "==", data.nisn))
    const akunSnap = await getDocs(qAkun)

    list.push({
      uid: d.id,
      ...data,
      kelasNama: data.kelasId ? kelasMap.get(data.kelasId) || "Kelas Terpilih" : null,
      muridData: muridSnap.exists() ? muridSnap.data() : null,
      isNisnTerhubungAkunLain: !akunSnap.empty,
    })
  }

  return list
}

/**
 * Guru menyetujui klaim akun murid
 * Jika data murid belum ada di koleksi 'murid', otomatis dibuatkan dengan kelas yang dipilih murid
 */
export async function approveKlaim(claim) {
  // Validasi ketat: Cegah persetujuan jika NISN sudah terhubung ke akun murid lain
  const qAkun = query(collection(db, "akunMurid"), where("nisn", "==", claim.nisn))
  const akunSnap = await getDocs(qAkun)
  const isUsedByOther = akunSnap.docs.some((d) => d.id !== claim.uid)
  if (isUsedByOther) {
    throw new Error(
      `Gagal menyetujui: NISN ${claim.nisn} sudah aktif digunakan oleh akun murid lain. Setiap siswa harus memiliki NISN unik.`
    )
  }

  const muridRef = doc(db, "murid", claim.nisn)
  const muridSnap = await getDoc(muridRef)

  if (!muridSnap.exists()) {
    // Siswa belum terdaftar di database, daftarkan otomatis dengan data dari klaim
    await setDoc(muridRef, {
      nisn: claim.nisn,
      nama: claim.nama,
      kelasId: claim.kelasId || "",
      email: claim.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else if (claim.kelasId && !muridSnap.data().kelasId) {
    // Update kelas siswa jika sebelumnya kosong
    await updateDoc(muridRef, {
      kelasId: claim.kelasId,
      updatedAt: serverTimestamp(),
    })
  }

  // Buat dokumen akunMurid
  const akunRef = doc(db, "akunMurid", claim.uid)
  await setDoc(akunRef, {
    nisn: claim.nisn,
    email: claim.email,
    aktivasiVia: "persetujuan",
    createdAt: serverTimestamp(),
  })

  // Hapus klaim setelah disetujui
  await deleteDoc(doc(db, "klaim", claim.uid))
}

/**
 * Guru menolak klaim akun murid
 */
export async function rejectKlaim(uid, catatan) {
  const ref = doc(db, "klaim", uid)
  return await updateDoc(ref, {
    status: "ditolak",
    catatan: catatan || "Data tidak sesuai.",
    updatedAt: serverTimestamp(),
  })
}

/**
 * Murid membatalkan permohonan klaim yang masih berstatus 'menunggu'
 */
export async function batalKlaim(uid) {
  const ref = doc(db, "klaim", uid)
  return await deleteDoc(ref)
}

/**
 * Guru memutus tautan akun murid
 */
export async function unlinkAkunMurid(uid) {
  return await deleteDoc(doc(db, "akunMurid", uid))
}
