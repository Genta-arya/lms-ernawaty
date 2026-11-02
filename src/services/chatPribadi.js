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
 * Menghasilkan chatId unik yang deterministik dari dua identifier (uid atau nisn)
 * sehingga urutan A dan B selalu menghasilkan chatId yang persis sama.
 */
export function getPrivateChatId(idA, idB) {
  if (!idA || !idB) return null
  return [String(idA), String(idB)].sort().join("_")
}

/**
 * Mengirim pesan chat pribadi antar siswa / guru
 */
export async function sendPesanPribadi({
  chatId,
  pengirimId,
  penerimaId,
  pengirimNama,
  pengirimFotoUrl,
  pesan,
}) {
  const cleanPesan = (pesan || "").trim()
  if (!cleanPesan || !chatId) {
    throw new Error("Pesan dan Chat ID tidak boleh kosong.")
  }

  return await addDoc(collection(db, "chatPribadi"), {
    chatId,
    participants: [String(pengirimId), String(penerimaId)],
    pengirimId: String(pengirimId),
    penerimaId: String(penerimaId),
    pengirimNama: pengirimNama || "Siswa",
    pengirimFotoUrl: pengirimFotoUrl || null,
    pesan: cleanPesan,
    createdAt: serverTimestamp(),
  })
}

/**
 * Berlangganan pesan chat pribadi secara realtime
 */
export function subscribePesanPribadi(chatId, callback) {
  if (!chatId) {
    callback([])
    return () => {}
  }

  const q = query(
    collection(db, "chatPribadi"),
    where("chatId", "==", chatId),
    orderBy("createdAt", "asc"),
    limit(80)
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
      console.warn("Realtime chat pribadi error:", err)
      callback([])
    }
  )
}
