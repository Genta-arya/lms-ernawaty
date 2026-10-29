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
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { templateKuisTeksRekon } from "@/data/templateKuisTeksRekon"
import { getMateriList } from "./materi"

export async function getKuisList(isGuru = false) {
  let q
  if (isGuru) {
    q = query(collection(db, "kuis"))
  } else {
    q = query(collection(db, "kuis"), where("status", "==", "terbit"))
  }

  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getKuisByMateriId(materiId, isGuru = false) {
  try {
    let q
    if (isGuru) {
      q = query(collection(db, "kuis"), where("materiId", "==", materiId))
    } else {
      q = query(
        collection(db, "kuis"),
        where("materiId", "==", materiId),
        where("status", "==", "terbit")
      )
    }

    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.warn("getKuisByMateriId direct query notice:", err)
    // Fallback: ambil semua kuis dan filter di memori agar bebas index requirement
    const all = await getKuisList(isGuru)
    return all.filter((k) => k.materiId === materiId)
  }
}

export async function getKuisById(id) {
  const ref = doc(db, "kuis", id)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() }
  }
  return null
}

export async function createKuis(data) {
  const { id: _, ...cleanData } = data
  return await addDoc(collection(db, "kuis"), {
    ...cleanData,
    jumlahSoal: cleanData.soal ? cleanData.soal.length : 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateKuis(id, data) {
  const ref = doc(db, "kuis", id)
  const { id: _, ...cleanData } = data
  // Menggunakan setDoc dengan merge: true agar aman
  return await setDoc(
    ref,
    {
      ...cleanData,
      jumlahSoal: cleanData.soal ? cleanData.soal.length : 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteKuis(id) {
  const ref = doc(db, "kuis", id)
  return await deleteDoc(ref)
}

/**
 * Seeding template 3 Kuis Teks Rekon
 * Mencegah duplikasi kuis jika kuis dengan judul yang sama sudah ada di database
 */
export async function seedKuisTemplate() {
  const [allMateri, allKuis] = await Promise.all([
    getMateriList(true),
    getKuisList(true),
  ])

  const existingTitles = new Set(allKuis.map((k) => (k.judul || "").trim().toLowerCase()))
  const toCreate = templateKuisTeksRekon.filter(
    (t) => !existingTitles.has(t.judul.trim().toLowerCase())
  )

  if (toCreate.length === 0) {
    throw new Error("Semua kuis template Teks Rekon sudah ada di database. Tidak ada kuis duplikat yang dibuat.")
  }

  const materiMap = new Map()
  allMateri.forEach((m) => {
    if (m.slug) materiMap.set(m.slug, m)
  })

  const batch = writeBatch(db)

  for (const t of toCreate) {
    const matchedMateri = materiMap.get(t.targetSlug)
    const ref = doc(collection(db, "kuis"))

    batch.set(ref, {
      judul: t.judul,
      deskripsi: t.deskripsi,
      materiId: matchedMateri ? matchedMateri.id : null,
      tingkat: matchedMateri ? matchedMateri.tingkat : ["VII", "VIII", "IX"],
      nilaiLulus: t.nilaiLulus,
      acakSoal: t.acakSoal,
      acakOpsi: t.acakOpsi,
      maksPercobaan: t.maksPercobaan,
      status: t.status,
      jumlahSoal: t.soal.length,
      soal: t.soal,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  await batch.commit()
  return toCreate.length
}
