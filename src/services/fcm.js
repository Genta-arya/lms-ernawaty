import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { app, db } from "@/lib/firebase"

let messagingInstance = null

/**
 * Inisialisasi Firebase Messaging secara aman (cek ketersediaan browser & service worker)
 */
export async function getFirebaseMessaging() {
  if (messagingInstance) return messagingInstance
  const supported = await isSupported().catch(() => false)
  if (supported && typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      messagingInstance = getMessaging(app)
      return messagingInstance
    } catch (e) {
      console.warn("Firebase Messaging gagal diinisialisasi:", e)
      return null
    }
  }
  return null
}

/**
 * Mendaftarkan service worker dan meminta izin notifikasi browser sistem
 * @param {string} userId - UID akun yang sedang login
 * @param {string} userNisn - NISN murid (opsional)
 */
export async function requestNotificationPermissionAndGetToken(userId, userNisn = null) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.log("Browser ini tidak mendukung notifikasi desktop/push.")
    return null
  }

  try {
    const messaging = await getFirebaseMessaging()
    if (!messaging) return null

    // Minta izin ke pengguna
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      console.log("Izin notifikasi tidak diberikan oleh pengguna:", permission)
      return null
    }

    // Daftarkan service worker dengan meneruskan kredensial Firebase via query params
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || ""
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "lsm-ernawaty"
    const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ""
    const appId = import.meta.env.VITE_FIREBASE_APP_ID || ""

    const swUrl = `/firebase-messaging-sw.js?apiKey=${apiKey}&projectId=${projectId}&messagingSenderId=${messagingSenderId}&appId=${appId}`
    const registration = await navigator.serviceWorker.register(swUrl)

    // VAPID Key (opsional jika dikonfigurasi di .env)
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: vapidKey,
    })

    if (token && userId) {
      // Simpan token ke Firestore agar backend / Cloud Functions dapat mengirim push notification ke user ini
      const tokenRef = doc(db, "fcmTokens", `${userId}_${token.slice(-10)}`)
      await setDoc(
        tokenRef,
        {
          token,
          userId: String(userId),
          nisn: userNisn ? String(userNisn) : null,
          platform: navigator.userAgentData?.platform || navigator.platform || "Web",
          userAgent: navigator.userAgent,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {})
    }

    return token
  } catch (err) {
    console.warn("Gagal mendapatkan FCM registration token:", err)
    return null
  }
}

/**
 * Berlangganan pesan FCM saat aplikasi sedang terbuka di foreground
 */
export async function onForegroundMessage(callback) {
  const messaging = await getFirebaseMessaging()
  if (!messaging) return () => {}

  return onMessage(messaging, (payload) => {
    console.log("[FCM Foreground] Pesan masuk:", payload)

    // Tampilkan notifikasi sistem jika diizinkan
    if (Notification.permission === "granted") {
      const title = payload.notification?.title || payload.data?.title || "Pesan Baru"
      const options = {
        body: payload.notification?.body || payload.data?.pesan || payload.data?.body || "",
        icon: payload.notification?.icon || payload.data?.fotoUrl || "/favicon.ico",
        badge: "/favicon.ico",
      }
      try {
        new Notification(title, options)
      } catch (_) {}
    }

    if (callback) callback(payload)
  })
}

