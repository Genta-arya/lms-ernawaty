import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

/**
 * Mengirim pesan chat baru ke ruang kelas
 */
export async function sendPesanKelas({
  kelasId,
  pengirimUid,
  pengirimNisn,
  pengirimNama,
  pengirimFotoUrl,
  pesan,
}) {
  const cleanPesan = (pesan || "").trim()
  if (!cleanPesan || !kelasId) {
    throw new Error("Pesan dan ID kelas tidak boleh kosong.")
  }

  return await addDoc(collection(db, "chatKelas"), {
    kelasId,
    pengirimUid: pengirimUid || null,
    pengirimNisn: pengirimNisn || null,
    pengirimNama: pengirimNama || "Siswa",
    pengirimFotoUrl: pengirimFotoUrl || null,
    pesan: cleanPesan,
    createdAt: serverTimestamp(),
  })
}

/**
 * Berlangganan (realtime subscription) pesan obrolan kelas
 */
export function subscribePesanKelas(kelasId, callback) {
  if (!kelasId) {
    callback([])
    return () => {}
  }

  // Ambil 60 pesan terakhir
  const q = query(
    collection(db, "chatKelas"),
    where("kelasId", "==", kelasId),
    orderBy("createdAt", "asc"),
    limit(60)
  )

  return onSnapshot(
    q,
    (snap) => {
      const messages = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      callback(messages)
    },
    (err) => {
      console.warn("Realtime chat kelas error:", err)
      callback([])
    }
  )
}

