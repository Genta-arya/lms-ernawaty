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
import { templateMateriTeksRekon } from "@/data/templateMateriTeksRekon"

export async function getMateriList(isGuru = false) {
  let q
  if (isGuru) {
    q = query(collection(db, "materi"))
  } else {
    // Query hanya dengan status agar tidak memerlukan Firestore Composite Index manual
    q = query(collection(db, "materi"), where("status", "==", "terbit"))
  }

  const snap = await getDocs(q)
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  // Urutkan di sisi klien berdasarkan field urutan
  return list.sort((a, b) => (Number(a.urutan) || 0) - (Number(b.urutan) || 0))
}

export async function getMateriBySlug(slug, isGuru = false) {
  if (!slug) return null

  // 1. Coba query langsung dengan filter status (sesuai Security Rules)
  try {
    let q
    if (isGuru) {
      q = query(collection(db, "materi"), where("slug", "==", slug))
    } else {
      q = query(
        collection(db, "materi"),
        where("slug", "==", slug),
        where("status", "==", "terbit")
      )
    }

    const snap = await getDocs(q)
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() }
    }
  } catch (err) {
    console.warn("Direct slug query notice:", err)
  }

  // 2. Fallback: Ambil dari daftar materi terbit dan cocokkan slug / id di memory
  try {
    const list = await getMateriList(isGuru)
    const found = list.find((m) => m.slug === slug || m.id === slug)
    if (found) return found
  } catch (err) {
    console.warn("Fallback list query notice:", err)
  }

  // 3. Fallback jika slug adalah document ID langsung
  try {
    const docRef = doc(db, "materi", slug)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      if (isGuru || data.status === "terbit") {
        return { id: docSnap.id, ...data }
      }
    }
  } catch (err) {
    console.error("Gagal mengambil materi by docId:", err)
  }

  return null
}

export async function getMateriById(id) {
  const ref = doc(db, "materi", id)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() }
  }
  return null
}

export async function createMateri(data) {
  const { id: _, ...cleanData } = data
  return await addDoc(collection(db, "materi"), {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateMateri(id, data) {
  const ref = doc(db, "materi", id)
  const { id: _, ...cleanData } = data
  // Menggunakan setDoc dengan merge: true agar tidak gagal dengan "No document to update"
  return await setDoc(
    ref,
    {
      ...cleanData,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteMateri(id) {
  const ref = doc(db, "materi", id)
  return await deleteDoc(ref)
}

/**
 * Seeding template Teks Rekon (3 materi awal)
 * Mencegah pembuatan ganda jika materi dengan slug yang sama sudah ada di database
 */
export async function seedMateriTemplate() {
  const existingMateri = await getMateriList(true)
  const existingSlugs = new Set(existingMateri.map((m) => (m.slug || "").trim().toLowerCase()))
  const existingTitles = new Set(existingMateri.map((m) => (m.judul || "").trim().toLowerCase()))

  // Filter hanya template yang belum pernah ada
  const toCreate = templateMateriTeksRekon.filter(
    (m) =>
      !existingSlugs.has(m.slug.toLowerCase().trim()) &&
      !existingTitles.has(m.judul.toLowerCase().trim())
  )

  if (toCreate.length === 0) {
    throw new Error("Semua materi template Teks Rekon sudah ada di database. Tidak ada materi duplikat yang dibuat.")
  }

  const batch = writeBatch(db)

  for (const m of toCreate) {
    const ref = doc(collection(db, "materi"))
    batch.set(ref, {
      ...m,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  await batch.commit()
  return toCreate.length
}
