import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

const COLLECTION_NAME = "forumDiskusi"

/**
 * Berlangganan daftar diskusi untuk materi tertentu (real-time)
 */
export function subscribeForumByMateri(materiId, callback) {
  if (!materiId) return () => {}

  const q = query(
    collection(db, COLLECTION_NAME),
    where("materiId", "==", materiId),
    orderBy("createdAt", "asc")
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      callback(items)
    },
    (err) => {
      console.error("Error subscribing to forum diskusi:", err)
      callback([])
    }
  )
}

/**
 * Berlangganan postingan diskusi terbaru untuk dashboard guru (semua materi)
 */
export function subscribeRecentForumDiscussions(maxLimit = 6, callback) {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy("createdAt", "desc"),
    limit(maxLimit)
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      callback(items)
    },
    (err) => {
      console.error("Error subscribing to recent forum diskusi:", err)
      callback([])
    }
  )
}

/**
 * Kirim postingan baru (topik utama atau balasan)
 */
export async function kirimDiskusi({
  materiId,
  materiJudul,
  materiSlug,
  pengirimId,
  pengirimNama,
  pengirimFotoUrl = null,
  pengirimRole = "murid",
  pengirimKelas = null,
  isi,
  parentId = null,
}) {
  if (!materiId || !pengirimId || !isi?.trim()) {
    throw new Error("Parameter tidak lengkap untuk mengirim diskusi")
  }

  const docData = {
    materiId,
    materiJudul: materiJudul || "Materi Pembelajaran",
    materiSlug: materiSlug || "",
    pengirimId,
    pengirimNama: pengirimNama || "Anonim",
    pengirimFotoUrl: pengirimFotoUrl || null,
    pengirimRole: pengirimRole || "murid",
    pengirimKelas: pengirimKelas || null,
    isi: isi.trim(),
    parentId: parentId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  return await addDoc(collection(db, COLLECTION_NAME), docData)
}

/**
 * Hapus komentar/postingan diskusi
 */
export async function hapusDiskusi(diskusiId) {
  if (!diskusiId) return
  const docRef = doc(db, COLLECTION_NAME, diskusiId)
  await deleteDoc(docRef)
}



/**
 * Berlangganan ringkasan jumlah diskusi untuk setiap materi
 */
export function subscribeAllForumCounts(callback) {
  const q = query(collection(db, COLLECTION_NAME));
  return onSnapshot(
    q,
    (snapshot) => {
      const counts = {};
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.materiId) {
          counts[data.materiId] = (counts[data.materiId] || 0) + 1;
        }
      });
      callback(counts);
    },
    (err) => {
      console.error("Error subscribing to forum counts:", err);
      callback({});
    }
  );
}
