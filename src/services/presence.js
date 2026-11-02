import { collection, doc, setDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

const HEARTBEAT_INTERVAL = 25000 // Kirim sinyal online setiap 25 detik
const ONLINE_THRESHOLD = 65000   // Dianggap online jika detak terakhir < 65 detik yang lalu

/**
 * Memulai pengiriman sinyal status online (heartbeat) pengguna.
 * Mengupdate ke koleksi akunMurid (yang sudah pasti memiliki izin write/update di Firestore)
 * dan fallback/mirror ke userPresence.
 */
export function startUserPresence(userId, userName, role = "murid", nisn = null) {
  if (!userId) return () => {}

  const akunMuridRef = doc(db, "akunMurid", String(userId))
  const userPresenceRef = doc(db, "userPresence", String(userId))

  const updateStatus = async (isOnline) => {
    const payload = {
      isOnline,
      lastSeen: serverTimestamp(),
      clientTime: Date.now(),
    }

    // 1. Update ke akunMurid (koleksi utama dengan rule update: if request.auth.uid == uid)
    try {
      await updateDoc(akunMuridRef, payload)
    } catch (_) {
      try {
        await setDoc(akunMuridRef, payload, { merge: true })
      } catch (errAkun) {
        // Abaikan jika akun adalah guru / non-murid
      }
    }

    // 2. Mirror ke userPresence (jika koleksi userPresence sudah dipublish di rules)
    try {
      await setDoc(
        userPresenceRef,
        {
          userId: String(userId),
          userName: userName || "Pengguna",
          role,
          nisn: nisn || null,
          ...payload,
        },
        { merge: true }
      )
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

  // Tangani saat tab dibuka kembali dari background
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      updateStatus(true)
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange)

  // Tangani saat tab browser ditutup
  const handleBeforeUnload = () => {
    updateStatus(false)
  }
  window.addEventListener("beforeunload", handleBeforeUnload)

  return () => {
    clearInterval(intervalId)
    document.removeEventListener("visibilitychange", handleVisibilityChange)
    window.removeEventListener("beforeunload", handleBeforeUnload)
  }
}

/**
 * Berlangganan status online seluruh siswa secara realtime.
 * Mendengarkan koleksi 'akunMurid' (karena sudah pasti memiliki 'allow read: if signedIn();')
 * dan fallback ke 'userPresence'.
 */
export function subscribeAllPresences(callback) {
  // Listener utama: akunMurid
  const unsubAkunMurid = onSnapshot(
    collection(db, "akunMurid"),
    (snap) => {
      const presenceMap = {}
      snap.docs.forEach((d) => {
        const data = d.data()
        const parsed = parsePresenceStatus(data)
        const uid = d.id
        const nisn = data.nisn ? String(data.nisn) : null

        if (uid) presenceMap[uid] = parsed
        if (nisn) presenceMap[nisn] = parsed
      })
      callback(presenceMap)
    },
    (err) => {
      console.warn("AkunMurid presence listener warning:", err)
      // Fallback ke userPresence
      onSnapshot(
        collection(db, "userPresence"),
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
        () => callback({})
      )
    }
  )

  return () => unsubAkunMurid()
}

/**
 * Berlangganan status online / terakhir online untuk 1 pengguna tertentu
 */
export function subscribeSinglePresence(userId, callback) {
  if (!userId) {
    callback({ isOnline: false, lastSeenText: "Tidak diketahui" })
    return () => {}
  }

  // Coba ambil dari akunMurid dulu
  const ref = doc(db, "akunMurid", String(userId))
  return onSnapshot(
    ref,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        callback(parsePresenceStatus(data))
      } else {
        // Coba userPresence
        const presenceRef = doc(db, "userPresence", String(userId))
        onSnapshot(
          presenceRef,
          (pSnap) => {
            if (pSnap.exists()) {
              callback(parsePresenceStatus(pSnap.data()))
            } else {
              callback({ isOnline: false, lastSeenText: "Offline" })
            }
          },
          () => callback({ isOnline: false, lastSeenText: "Offline" })
        )
      }
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
    return `Terakhir dilihat ${diffMin} mnt lalu`
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
    return `Terakhir dilihat ${jamMenit}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    yesterday.getDate() === date.getDate() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getFullYear() === date.getFullYear()

  if (isYesterday) {
    return `Kemarin ${jamMenit}`
  }

  const tglBulan = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  })
  return `${tglBulan} ${jamMenit}`
}
