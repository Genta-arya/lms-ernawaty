import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  where,
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
  pengirimNisn,
  penerimaId,
  penerimaNisn,
  pengirimNama,
  pengirimFotoUrl,
  pesan,
}) {
  const cleanPesan = (pesan || "").trim()
  if (!cleanPesan || !chatId) {
    throw new Error("Pesan dan Chat ID tidak boleh kosong.")
  }

  // Bersihkan status mengetik saat pesan dikirim
  if (chatId && pengirimId) {
    setTypingStatusPribadi(chatId, pengirimId, "", false).catch(() => {})
  }

  const pNisn = pengirimNisn || (typeof pengirimId === "string" && !pengirimId.includes("-") && pengirimId.length <= 15 ? pengirimId : null)
  const rNisn = penerimaNisn || (typeof penerimaId === "string" && !penerimaId.includes("-") && penerimaId.length <= 15 ? penerimaId : null)

  return await addDoc(collection(db, "chatPribadi"), {
    chatId,
    participants: [String(pengirimId), String(penerimaId)],
    pengirimId: String(pengirimId),
    penerimaId: String(penerimaId),
    pengirimNisn: pNisn,
    penerimaNisn: rNisn,
    pengirimNama: pengirimNama || "Siswa",
    pengirimFotoUrl: pengirimFotoUrl || null,
    pesan: cleanPesan,
    createdAt: serverTimestamp(),
  })
}

/**
 * Berlangganan pesan chat pribadi secara realtime
 * Tidak memerlukan composite index di Firestore karena sorting dilakukan di sisi klien.
 */
export function subscribePesanPribadi(chatId, callback) {
  if (!chatId) {
    callback([])
    return () => {}
  }

  const q = query(
    collection(db, "chatPribadi"),
    where("chatId", "==", chatId),
    limit(100)
  )

  return onSnapshot(
    q,
    (snap) => {
      const messages = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))

      // Urutkan berdasarkan waktu di sisi klien (in-memory sort)
      messages.sort((a, b) => {
        const timeA = a.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : a.createdAt?.seconds
          ? a.createdAt.seconds * 1000
          : a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : b.createdAt?.seconds
          ? b.createdAt.seconds * 1000
          : b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeA - timeB
      })

      callback(messages)
    },
    (err) => {
      console.warn("Realtime chat pribadi error:", err)
      callback([])
    }
  )
}

/**
 * Memperbarui status 'sedang mengetik...' untuk chat pribadi
 */
export async function setTypingStatusPribadi(chatId, userId, userName, isTyping) {
  if (!chatId || !userId) return
  const docId = `${chatId}_${userId}`
  const ref = doc(db, "typingPribadi", docId)

  if (isTyping) {
    await setDoc(
      ref,
      {
        chatId,
        userId,
        userName: userName || "Teman",
        isTyping: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  } else {
    await deleteDoc(ref).catch(() => {})
  }
}

/**
 * Berlangganan jumlah chat pribadi yang belum dibaca per pengirim
 */
export function subscribeUnreadPribadiCounts(myIdentifiers = [], callback) {
  if (!myIdentifiers || myIdentifiers.length === 0) {
    callback({})
    return () => {}
  }

  const q = query(
    collection(db, "chatPribadi"),
    where("penerimaId", "in", myIdentifiers.map(String)),
    limit(100)
  )

  return onSnapshot(
    q,
    (snap) => {
      // Dapatkan list id pesan yang sudah dibaca dari storage
      let readIds = []
      try {
        const raw = localStorage.getItem("lsm_erna_murid_read_notifications_v3")
        readIds = raw ? JSON.parse(raw) : []
      } catch (_) {}

      const unreadMap = {}
      snap.docs.forEach((d) => {
        const notifId = `chat_pribadi_${d.id}`
        if (!readIds.includes(notifId)) {
          const data = d.data()
          const senderId = String(data.pengirimNisn || data.pengirimId || "")
          if (senderId) {
            unreadMap[senderId] = (unreadMap[senderId] || 0) + 1
          }
        }
      })

      callback(unreadMap)
    },
    (err) => {
      console.warn("Unread chat pribadi error:", err)
      callback({})
    }
  )
}
export function subscribeTypingPribadi(chatId, currentUserId, callback) {
  if (!chatId) {
    callback(null)
    return () => {}
  }

  const q = query(
    collection(db, "typingPribadi"),
    where("chatId", "==", chatId)
  )

  return onSnapshot(
    q,
    (snap) => {
      let isOtherTyping = false
      let otherName = ""
      const now = Date.now()

      snap.docs.forEach((d) => {
        const data = d.data()
        if (String(data.userId) === String(currentUserId)) return

        let timeMillis = 0
        if (data.updatedAt?.toMillis) timeMillis = data.updatedAt.toMillis()
        else if (data.updatedAt?.seconds) timeMillis = data.updatedAt.seconds * 1000

        if (!timeMillis || now - timeMillis < 6000) {
          isOtherTyping = true
          otherName = data.userName || "Teman"
        }
      })

      callback(isOtherTyping ? otherName : null)
    },
    (err) => {
      console.warn("Typing pribadi listener error:", err)
      callback(null)
    }
  )
}
