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

  // Bersihkan status mengetik saat pesan dikirim
  const myId = pengirimUid || pengirimNisn
  if (myId) {
    setTypingStatusKelas(kelasId, myId, "", false).catch(() => {})
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
 * Tidak memerlukan composite index di Firestore karena sorting dilakukan di sisi klien.
 */
export function subscribePesanKelas(kelasId, callback) {
  if (!kelasId) {
    callback([])
    return () => {}
  }

  // Gunakan single-field filter agar TIDAK memerlukan composite index di Firebase
  const q = query(
    collection(db, "chatKelas"),
    where("kelasId", "==", kelasId),
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
      console.warn("Realtime chat kelas error:", err)
      callback([])
    }
  )
}

/**
 * Memperbarui status 'sedang mengetik...' untuk kelas
 */
export async function setTypingStatusKelas(kelasId, userId, userName, isTyping) {
  if (!kelasId || !userId) return
  const docId = `${kelasId}_${userId}`
  const ref = doc(db, "typingKelas", docId)

  if (isTyping) {
    await setDoc(
      ref,
      {
        kelasId,
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
 * Berlangganan siapa saja yang sedang mengetik di kelas
 */
export function subscribeTypingKelas(kelasId, currentUserId, callback) {
  if (!kelasId) {
    callback([])
    return () => {}
  }

  const q = query(
    collection(db, "typingKelas"),
    where("kelasId", "==", kelasId)
  )

  return onSnapshot(
    q,
    (snap) => {
      const typers = []
      const now = Date.now()

      snap.docs.forEach((d) => {
        const data = d.data()
        // Jangan sertakan diri sendiri
        if (String(data.userId) === String(currentUserId)) return

        // Timeout status mengetik jika lebih dari 6 detik tanpa update
        let timeMillis = 0
        if (data.updatedAt?.toMillis) timeMillis = data.updatedAt.toMillis()
        else if (data.updatedAt?.seconds) timeMillis = data.updatedAt.seconds * 1000

        if (!timeMillis || now - timeMillis < 6000) {
          if (data.userName) typers.push(data.userName)
        }
      })

      callback(typers)
    },
    (err) => {
      console.warn("Typing listener error:", err)
      callback([])
    }
  )
}
