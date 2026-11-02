import { collection, doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

const HEARTBEAT_INTERVAL = 30000 // Kirim sinyal online setiap 30 detik
const ONLINE_THRESHOLD = 75000   // Dianggap online jika detak terakhir < 75 detik yang lalu

/**
 * Memulai pengiriman sinyal status online (heartbeat) pengguna ke Firestore
 */
export function startUserPresence(userId, userName, role = "murid", nisn = null) {
  if (!userId) return () => {}

  const uidDocRef = doc(db, "userPresence", String(userId))
  const nisnDocRef = nisn ? doc(db, "userPresence", String(nisn)) : null

  const updateStatus = async (isOnline) => {
    try {
      const payload = {
        userId: String(userId),
        userName: userName || "Pengguna",
        role,
        nisn: nisn || null,
        isOnline,
        lastSeen: serverTimestamp(),
        clientTime: Date.now(),
      }

      const tasks = [setDoc(uidDocRef, payload, { merge: true })]
      if (nisnDocRef) {
        tasks.push(setDoc(nisnDocRef, payload, { merge: true }))
      }
      await Promise.all(tasks)
    } catch (_) {}
  }

  // Set status awal saat login/aktif
  updateStatus(true)

  // Kirim heartbeat secara berkala
  const intervalId = setInterval(() => {
    if (document.visibilityState === "visible") {
      updateStatus(true)
    }
  }, HEARTBEAT_INTERVAL)

  // Tangani saat tab diminimalkan atau dibuka kembali
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      updateStatus(true)
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange)

  // Tangani saat pengguna menutup tab/browser
  const handleBeforeUnload = () => {
    // Upaya update offline
    updateStatus(false)
  }
  window.addEventListener("beforeunload", handleBeforeUnload)

  return () => {
    clearInterval(intervalId)
    document.removeEventListener("visibilitychange", handleVisibilityChange)
    window.removeEventListener("beforeunload", handleBeforeUnload)
    updateStatus(false).catch(() => {})
  }
}

/**
 * Berlangganan status online / terakhir online untuk banyak pengguna (seluruh dokumen di userPresence)
 */
export function subscribeAllPresences(callback) {
  const colRef = collection(db, "userPresence")
  return onSnapshot(
    colRef,
    (snap) => {
      const presenceMap = {}
      snap.docs.forEach((d) => {
        const data = d.data()
        const parsed = parsePresenceStatus(data)
        if (data.userId) presenceMap[String(data.userId)] = parsed
        if (data.nisn) presenceMap[String(data.nisn)] = parsed
      })
      callback(presenceMap)
    },
    (err) => {
      console.warn("Realtime presences error:", err)
      callback({})
    }
  )
}

/**
 * Berlangganan status online / terakhir online untuk 1 pengguna tertentu
 */
export function subscribeSinglePresence(userId, callback) {
  if (!userId) {
    callback({ isOnline: false, lastSeenText: "Tidak diketahui" })
    return () => {}
  }

  const userDocRef = doc(db, "userPresence", String(userId))
  return onSnapshot(
    userDocRef,
    (docSnap) => {
      if (!docSnap.exists()) {
        callback({ isOnline: false, lastSeenText: "Offline" })
        return
      }

      const data = docSnap.data()
      const status = parsePresenceStatus(data)
      callback(status)
    },
    () => {
      callback({ isOnline: false, lastSeenText: "Offline" })
    }
  )
}

/**
 * Format status online dan terakhir dilihat
 */
export function parsePresenceStatus(data) {
  if (!data) return { isOnline: false, lastSeenText: "Offline" }

  const now = Date.now()
  let lastTimeMillis = 0

  if (data.lastSeen?.toMillis) {
    lastTimeMillis = data.lastSeen.toMillis()
  } else if (data.lastSeen?.seconds) {
    lastTimeMillis = data.lastSeen.seconds * 1000
  } else if (data.clientTime) {
    lastTimeMillis = data.clientTime
  }

  const diffMs = now - lastTimeMillis
  const isOnline = data.isOnline === true && diffMs < ONLINE_THRESHOLD

  if (isOnline) {
    return { isOnline: true, lastSeenText: "Online" }
  }

  if (!lastTimeMillis) {
    return { isOnline: false, lastSeenText: "Offline" }
  }

  return {
    isOnline: false,
    lastSeenText: formatTerakhirOnline(lastTimeMillis),
  }
}

/**
 * Format waktu relatif ala WhatsApp (misal: "Terakhir dilihat 5 menit yang lalu", "Terakhir dilihat kemarin pukul 14:30")
 */
export function formatTerakhirOnline(timestamp) {
  if (!timestamp) return "Offline"

  const now = new Date()
  const date = new Date(timestamp)
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffSec < 60) {
    return "Terakhir dilihat baru saja"
  }

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) {
    return `Terakhir dilihat ${diffMin} menit yang lalu`
  }

  const jamMenit = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })

  const isToday =
    now.getDate() === date.getDate() &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear()

  if (isToday) {
    return `Terakhir dilihat hari ini pukul ${jamMenit}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    yesterday.getDate() === date.getDate() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getFullYear() === date.getFullYear()

  if (isYesterday) {
    return `Terakhir dilihat kemarin pukul ${jamMenit}`
  }

  const tglBulan = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  })
  return `Terakhir dilihat ${tglBulan} pukul ${jamMenit}`
}

