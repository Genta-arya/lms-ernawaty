import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore"
import { updateProfile } from "firebase/auth"
import { db, auth } from "@/lib/firebase"

export async function getMuridList() {
  const muridSnap = await getDocs(collection(db, "murid"))
  const akunSnap = await getDocs(collection(db, "akunMurid"))

  // Mapping akun yang sudah terhubung berdasarkan NISN
  const linkedNisnMap = new Map()
  akunSnap.forEach((d) => {
    const data = d.data()
    if (data.nisn) {
      linkedNisnMap.set(data.nisn, { uid: d.id, ...data })
    }
  })

  const list = []
  muridSnap.forEach((d) => {
    const data = d.data()
    const linked = linkedNisnMap.get(d.id)
    const effectiveEmail = data.email || linked?.email || null
    list.push({
      nisn: d.id,
      ...data,
      email: effectiveEmail,
      isLinked: !!linked,
      akunMurid: linked || null,
    })
  })

  return list.sort((a, b) => a.nama.localeCompare(b.nama))
}

export async function getMuridByNisn(nisn) {
  const ref = doc(db, "murid", nisn)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { nisn: snap.id, ...snap.data() }
  }
  return null
}

export async function createMurid(data) {
  const nisn = String(data.nisn).trim()
  if (!/^\d{10}$/.test(nisn)) {
    throw new Error("NISN harus terdiri dari tepat 10 digit angka.")
  }

  const ref = doc(db, "murid", nisn)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    throw new Error(`Murid dengan NISN ${nisn} sudah terdaftar.`)
  }

  await setDoc(ref, {
    nisn,
    nama: data.nama.trim(),
    kelasId: data.kelasId,
    email: data.email ? data.email.trim().toLowerCase() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateMurid(oldNisn, data) {
  const newNisn = String(data.nisn || oldNisn).trim()
  if (!/^\d{10}$/.test(newNisn)) {
    throw new Error("NISN harus terdiri dari tepat 10 digit angka.")
  }

  const cleanNewEmail = data.email ? data.email.trim().toLowerCase() : null

  // JIKA NISN TIDAK BERUBAH
  if (newNisn === oldNisn) {
    const ref = doc(db, "murid", oldNisn)
    const oldSnap = await getDoc(ref)
    const oldData = oldSnap.exists() ? oldSnap.data() : {}
    const oldEmail = (oldData.email || "").trim().toLowerCase()

    await updateDoc(ref, {
      nama: data.nama.trim(),
      kelasId: data.kelasId,
      email: cleanNewEmail,
      updatedAt: serverTimestamp(),
    })

    // Jika alamat email diubah atau dihapus oleh guru
    if (cleanNewEmail !== oldEmail) {
      const qAkun = query(collection(db, "akunMurid"), where("nisn", "==", oldNisn))
      const akunDocs = await getDocs(qAkun)
      const batch = writeBatch(db)

      // Hapus binding akun Google lama agar akun Google baru murid dapat terhubung dengan lancar
      akunDocs.forEach((d) => {
        batch.delete(d.ref)
      })

      // Sinkronkan juga pada klaim yang sedang aktif/menunggu jika ada
      const qKlaim = query(collection(db, "klaim"), where("nisn", "==", oldNisn))
      const klaimDocs = await getDocs(qKlaim)
      klaimDocs.forEach((d) => {
        if (cleanNewEmail) {
          batch.update(d.ref, { email: cleanNewEmail })
        } else {
          batch.delete(d.ref)
        }
      })

      await batch.commit()
    }

    return oldNisn
  }

  // JIKA NISN BERUBAH:
  // 1. Cek apakah NISN baru sudah digunakan oleh murid lain
  const newDocRef = doc(db, "murid", newNisn)
  const existingNew = await getDoc(newDocRef)
  if (existingNew.exists()) {
    throw new Error(`NISN ${newNisn} sudah digunakan oleh siswa lain.`)
  }

  // 2. Ambil dokumen murid lama
  const oldDocRef = doc(db, "murid", oldNisn)
  const oldSnap = await getDoc(oldDocRef)
  const oldData = oldSnap.exists() ? oldSnap.data() : {}
  const oldEmail = (oldData.email || "").trim().toLowerCase()

  const batch = writeBatch(db)

  // 3. Salin data ke dokumen murid baru dengan ID newNisn
  batch.set(newDocRef, {
    ...oldData,
    nisn: newNisn,
    nama: data.nama.trim(),
    kelasId: data.kelasId,
    email: cleanNewEmail,
    updatedAt: serverTimestamp(),
  })

  // 4. Hapus dokumen murid lama
  batch.delete(oldDocRef)

  // 5. Perbarui akunMurid yang terhubung jika ada
  const qAkun = query(collection(db, "akunMurid"), where("nisn", "==", oldNisn))
  const akunDocs = await getDocs(qAkun)
  akunDocs.forEach((d) => {
    if (cleanNewEmail && cleanNewEmail !== oldEmail) {
      // Jika email juga berubah, lepaskan akun lama agar email Google baru murid dapat auto-aktivasi
      batch.delete(d.ref)
    } else {
      batch.update(d.ref, {
        nisn: newNisn,
        updatedAt: serverTimestamp(),
      })
    }
  })

  // 6. Perbarui permintaan aktivasi (klaim) jika ada
  const qKlaim = query(collection(db, "klaim"), where("nisn", "==", oldNisn))
  const klaimDocs = await getDocs(qKlaim)
  klaimDocs.forEach((d) => {
    batch.update(d.ref, {
      nisn: newNisn,
      ...(cleanNewEmail ? { email: cleanNewEmail } : {}),
    })
  })

  // 7. Perbarui riwayat pengerjaan kuis (percobaan) jika ada
  const qPercobaan = query(collection(db, "percobaan"), where("nisn", "==", oldNisn))
  const percobaanDocs = await getDocs(qPercobaan)
  percobaanDocs.forEach((p) => {
    batch.update(p.ref, {
      nisn: newNisn,
    })
  })

  // 8. Perbarui progres materi jika ada
  const qProgres = query(collection(db, "progres"), where("nisn", "==", oldNisn))
  const progresDocs = await getDocs(qProgres)
  progresDocs.forEach((pr) => {
    batch.update(pr.ref, {
      nisn: newNisn,
    })
  })

  await batch.commit()
  return newNisn
}

/**
 * Guru memutuskan tautan akun Google murid (Unlink Account)
 * Memungkinkan siswa masuk dengan akun Google baru jika akun lama hilang/berganti
 */
export async function unlinkAkunMurid(nisn) {
  const qAkun = query(collection(db, "akunMurid"), where("nisn", "==", nisn))
  const snap = await getDocs(qAkun)
  const batch = writeBatch(db)
  snap.forEach((d) => batch.delete(d.ref))
  await batch.commit()
  return true
}

/**
 * Siswa memperbarui nama tampilan mereka sendiri
 */
export async function updateMuridNama(nisn, uid, newNama) {
  const cleanNama = newNama.trim()
  if (!cleanNama) {
    throw new Error("Nama siswa tidak boleh kosong.")
  }

  // 1. Perbarui nama di Firebase Auth displayName terlebih dahulu (selalu diizinkan)
  if (auth.currentUser) {
    try {
      await updateProfile(auth.currentUser, {
        displayName: cleanNama,
      })
    } catch (e) {
      console.warn("Gagal update displayName Firebase Auth:", e)
    }
  }

  // 2. Perbarui nama di koleksi murid/{nisn}
  if (nisn) {
    try {
      const muridRef = doc(db, "murid", nisn)
      await updateDoc(muridRef, {
        nama: cleanNama,
        updatedAt: serverTimestamp(),
      })
    } catch (e) {
      console.warn("Catatan: Firestore murid/{nisn} memerlukan izin rules:", e)
    }
  }

  // 3. Perbarui nama di akunMurid/{uid} jika ada
  if (uid) {
    try {
      const akunRef = doc(db, "akunMurid", uid)
      const akunSnap = await getDoc(akunRef)
      if (akunSnap.exists()) {
        await updateDoc(akunRef, {
          nama: cleanNama,
          updatedAt: serverTimestamp(),
        })
      }
    } catch (e) {
      console.warn("Catatan: akunMurid tidak memerlukan pembaruan nama:", e)
    }
  }

  return cleanNama
}

/**
 * Siswa memperbarui foto profil mereka sendiri
 */
export async function updateMuridFotoUrl(nisn, uid, fotoUrl) {
  // 1. Perbarui photoURL di Firebase Auth terlebih dahulu (selalu diizinkan)
  if (auth.currentUser) {
    try {
      await updateProfile(auth.currentUser, {
        photoURL: fotoUrl,
      })
    } catch (e) {
      console.warn("Gagal update photoURL Firebase Auth:", e)
    }
  }

  // 2. Perbarui fotoUrl di murid/{nisn}
  if (nisn) {
    try {
      const muridRef = doc(db, "murid", nisn)
      await updateDoc(muridRef, {
        fotoUrl,
        updatedAt: serverTimestamp(),
      })
    } catch (e) {
      console.warn("Catatan: Firestore murid/{nisn} memerlukan izin rules:", e)
    }
  }

  // 3. Perbarui fotoUrl di akunMurid/{uid}
  if (uid) {
    try {
      const akunRef = doc(db, "akunMurid", uid)
      const akunSnap = await getDoc(akunRef)
      if (akunSnap.exists()) {
        await updateDoc(akunRef, {
          fotoUrl,
          updatedAt: serverTimestamp(),
        })
      }
    } catch (e) {
      console.warn("Catatan: akunMurid tidak memerlukan pembaruan foto:", e)
    }
  }

  return fotoUrl
}

export async function deleteMurid(nisn, deleteRiwayat = false) {
  // Hapus akunMurid jika terhubung
  const qAkun = query(collection(db, "akunMurid"), where("nisn", "==", nisn))
  const akunDocs = await getDocs(qAkun)
  const batch = writeBatch(db)

  akunDocs.forEach((d) => {
    batch.delete(d.ref)
  })

  // Hapus percobaan jika dipilih
  if (deleteRiwayat) {
    const qPercobaan = query(collection(db, "percobaan"), where("nisn", "==", nisn))
    const percobaanDocs = await getDocs(qPercobaan)
    percobaanDocs.forEach((p) => {
      batch.delete(p.ref)
    })
  }

  // Hapus dokumen murid
  batch.delete(doc(db, "murid", nisn))
  return await batch.commit()
}

export async function batchImportMurid(muridArray) {
  const batch = writeBatch(db)
  let count = 0

  for (const m of muridArray) {
    const ref = doc(db, "murid", m.nisn)
    batch.set(
      ref,
      {
        nisn: m.nisn,
        nama: m.nama,
        kelasId: m.kelasId,
        email: m.email ? m.email.toLowerCase() : null,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    )
    count++
  }

  await batch.commit()
  return count
}

