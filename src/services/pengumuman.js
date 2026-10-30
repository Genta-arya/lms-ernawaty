import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
} from "firebase/database"
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
} from "firebase/firestore"
import { rtdb, db } from "@/lib/firebase"
import { isMateriCocokTingkat } from "@/lib/utils"

const RTDB_PATH = "pengumuman"
const FIRESTORE_COL = "pengumuman"
const CACHE_KEY = "lsm_pengumuman_local_cache"

/**
 * Registry langganan aktif dalam sesi memori aplikasi
 */
const activeSubscribers = new Set()

/**
 * Mengambil cache pengumuman dari penyimpanan lokal
 */
export function getLocalCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (_) {
    return []
  }
}

/**
 * Menyimpan cache pengumuman ke penyimpanan lokal
 */
export function saveLocalCache(items) {
  try {
    if (Array.isArray(items)) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(items))
    }
  } catch (_) {}
}

/**
 * Menyiarkan pembaruan data secara instan ke seluruh antarmuka yang sedang mendengarkan
 */
function broadcastUpdate(rawList) {
  saveLocalCache(rawList)
  activeSubscribers.forEach((sub) => {
    try {
      sub.callback(processList(rawList, sub.isGuru, sub.studentTingkat))
    } catch (err) {
      console.warn("Subscriber callback notice:", err)
    }
  })
}

/**
 * Helper pembatas waktu (timeout) agar operasi RTDB tidak pernah menggantung jika koneksi offline/salah URL
 */
function withTimeout(promise, ms = 1500) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Batas waktu RTDB terlampaui")), ms)
    ),
  ])
}

/**
 * Helper untuk memproses dan menyaring array pengumuman
 */
export function processList(rawList, isGuru = false, studentTingkat = null) {
  if (!Array.isArray(rawList)) return []

  const statusFiltered = isGuru
    ? rawList
    : rawList.filter((p) => p.status === "aktif")

  const filtered = studentTingkat
    ? statusFiltered.filter((p) => {
        if (!p.tingkat || p.tingkat.includes("SEMUA") || p.tingkat.length === 0) return true
        return isMateriCocokTingkat(p.tingkat, studentTingkat)
      })
    : statusFiltered

  return filtered.sort((a, b) => {
    if (a.prioritas === "penting" && b.prioritas !== "penting") return -1
    if (b.prioritas === "penting" && a.prioritas !== "penting") return 1
    const tA = Number(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt) || 0
    const tB = Number(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt) || 0
    return tB - tA
  })
}

/**
 * Berlangganan (Subscribe) realtime listener pengumuman.
 * Mendengarkan secara realtime dari RTDB dan Firestore secara bersamaan.
 */
export function subscribePengumumanList(callback, isGuru = false, studentTingkat = null) {
  const subRecord = { callback, isGuru, studentTingkat }
  activeSubscribers.add(subRecord)

  // 1. Tampilkan data dari cache lokal secara instan (0ms) jika ada
  const cached = getLocalCache()
  if (Array.isArray(cached) && cached.length > 0) {
    callback(processList(cached, isGuru, studentTingkat))
  }

  let hasReceivedData = false
  let rtdbUnsub = null
  let firestoreUnsub = null

  // 2. Sambungkan listener RTDB jika rtdb tersedia
  if (rtdb) {
    try {
      const pRef = ref(rtdb, RTDB_PATH)
      rtdbUnsub = onValue(
        pRef,
        (snapshot) => {
          const val = snapshot.val()
          if (val) {
            hasReceivedData = true
            const items = Object.keys(val).map((k) => ({
              id: k,
              ...val[k],
              tingkat: Array.isArray(val[k]?.tingkat) ? val[k].tingkat : ["VII", "VIII", "IX"],
            }))
            broadcastUpdate(items)
          } else {
            if (!hasReceivedData && cached.length === 0) {
              callback([])
            }
          }
        },
        (err) => {
          console.warn("RTDB listener warning:", err.message)
        }
      )
    } catch (err) {
      console.warn("RTDB ref warning:", err)
    }
  }

  // 3. Pasang fallback Firestore onSnapshot
  try {
    const q = query(collection(db, FIRESTORE_COL))
    firestoreUnsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          broadcastUpdate(items)
        } else if (!hasReceivedData && cached.length === 0) {
          callback([])
        }
      },
      (err) => {
        console.warn("Firestore snapshot notice:", err.message)
        if (!hasReceivedData && cached.length === 0) callback([])
      }
    )
  } catch (e) {
    if (!hasReceivedData && cached.length === 0) callback([])
  }

  return () => {
    activeSubscribers.delete(subRecord)
    if (typeof rtdbUnsub === "function") {
      try {
        rtdbUnsub()
      } catch (_) {}
    }
    if (typeof firestoreUnsub === "function") {
      try {
        firestoreUnsub()
      } catch (_) {}
    }
  }
}

/**
 * Mengambil daftar pengumuman satu kali
 */
export async function getPengumumanList(isGuru = false, studentTingkat = null) {
  // 1. Coba dari RTDB dengan batas waktu jika rtdb tersedia
  if (rtdb) {
    try {
      const pRef = ref(rtdb, RTDB_PATH)
      const snapshot = await withTimeout(get(pRef), 1200)
      if (snapshot.exists()) {
        const val = snapshot.val()
        const items = Object.keys(val).map((k) => ({
          id: k,
          ...val[k],
          tingkat: Array.isArray(val[k]?.tingkat) ? val[k].tingkat : ["VII", "VIII", "IX"],
        }))
        saveLocalCache(items)
        return processList(items, isGuru, studentTingkat)
      }
    } catch (_) {}
  }

  // 2. Fallback ke Firestore
  try {
    const snap = await getDocs(collection(db, FIRESTORE_COL))
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      saveLocalCache(items)
      return processList(items, isGuru, studentTingkat)
    }
  } catch (err) {
    console.warn("Firestore get notice:", err.message)
  }

  // 3. Fallback terakhir: Ambil dari cache lokal
  const cached = getLocalCache()
  return processList(cached, isGuru, studentTingkat)
}

/**
 * Mengambil detail satu pengumuman
 */
export async function getPengumumanById(id) {
  if (!id) return null
  if (rtdb) {
    try {
      const itemRef = ref(rtdb, `${RTDB_PATH}/${id}`)
      const snapshot = await withTimeout(get(itemRef), 1000)
      if (snapshot.exists()) {
        return { id: snapshot.key, ...snapshot.val() }
      }
    } catch (_) {}
  }

  try {
    const docRef = doc(db, FIRESTORE_COL, id)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() }
    }
  } catch (_) {}

  // Fallback cache lokal
  const cached = getLocalCache()
  return cached.find((item) => item.id === id) || null
}

/**
 * Membuat pengumuman baru (Dual-Write dengan Pembaruan Seketika)
 */
export async function createPengumuman(data) {
  const { id: _, ...cleanData } = data
  const now = Date.now()

  const payload = {
    ...cleanData,
    status: cleanData.status || "aktif",
    prioritas: cleanData.prioritas || "info",
    createdAt: now,
    updatedAt: now,
  }

  let generatedId = `p_${now}_${Math.random().toString(36).substr(2, 6)}`

  // Siapkan objek baru
  if (rtdb) {
    try {
      const pRef = ref(rtdb, RTDB_PATH)
      const newRef = push(pRef)
      generatedId = newRef.key
    } catch (_) {}
  }

  const newDoc = { id: generatedId, ...payload }

  // Pembaruan instan (Optimistic Broadcast) ke seluruh antarmuka lokal
  const currentList = getLocalCache()
  const updatedList = [newDoc, ...currentList.filter((item) => item.id !== generatedId)]
  broadcastUpdate(updatedList)

  // 1. Tulis ke RTDB jika rtdb tersedia
  let rtdbWritten = false
  if (rtdb) {
    try {
      const itemRef = ref(rtdb, `${RTDB_PATH}/${generatedId}`)
      await withTimeout(set(itemRef, payload), 1500)
      rtdbWritten = true
    } catch (err) {
      console.warn("RTDB set timeout/error, dialihkan ke Firestore:", err.message)
    }
  }

  // 2. Tulis ke Firestore (selalu dipanggil, instan & aman)
  let firestoreWritten = false
  try {
    await setDoc(doc(db, FIRESTORE_COL, generatedId), payload)
    firestoreWritten = true
  } catch (err) {
    console.warn("Firestore write notice:", err.message)
  }

  return newDoc
}

/**
 * Memperbarui pengumuman (Dual-Update dengan Pembaruan Seketika)
 */
export async function updatePengumuman(id, data) {
  const { id: _, ...cleanData } = data
  const payload = {
    ...cleanData,
    updatedAt: Date.now(),
  }

  // Update instan ke cache dan antarmuka
  const currentList = getLocalCache()
  const updatedList = currentList.map((item) =>
    item.id === id ? { ...item, ...payload } : item
  )
  broadcastUpdate(updatedList)

  // 1. Update RTDB jika rtdb tersedia
  if (rtdb) {
    try {
      const itemRef = ref(rtdb, `${RTDB_PATH}/${id}`)
      await withTimeout(update(itemRef, payload), 1500)
    } catch (err) {
      console.warn("RTDB update notice:", err.message)
    }
  }

  // 2. Update Firestore
  try {
    const docRef = doc(db, FIRESTORE_COL, id)
    await setDoc(docRef, payload, { merge: true })
  } catch (err) {
    console.warn("Firestore update notice:", err.message)
  }
}

/**
 * Menghapus pengumuman (Dual-Delete dengan Pembaruan Seketika)
 */
export async function deletePengumuman(id) {
  // Hapus instan dari cache dan antarmuka
  const currentList = getLocalCache()
  const updatedList = currentList.filter((item) => item.id !== id)
  broadcastUpdate(updatedList)

  // 1. Hapus RTDB jika rtdb tersedia
  if (rtdb) {
    try {
      const itemRef = ref(rtdb, `${RTDB_PATH}/${id}`)
      await withTimeout(remove(itemRef), 1500)
    } catch (err) {
      console.warn("RTDB remove notice:", err.message)
    }
  }

  // 2. Hapus Firestore
  try {
    await deleteDoc(doc(db, FIRESTORE_COL, id))
  } catch (err) {
    console.warn("Firestore delete notice:", err.message)
  }
}
