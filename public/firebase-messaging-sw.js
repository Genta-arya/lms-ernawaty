// Firebase Cloud Messaging Service Worker
// Mengimpor skrip Firebase compat untuk service worker
importScripts("https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js")

// Ambil konfigurasi dari query string atau fallback default
const urlParams = new URLSearchParams(location.search)

const firebaseConfig = {
  apiKey: urlParams.get("apiKey") || "",
  authDomain: urlParams.get("authDomain") || "",
  projectId: urlParams.get("projectId") || "lsm-ernawaty",
  storageBucket: urlParams.get("storageBucket") || "",
  messagingSenderId: urlParams.get("messagingSenderId") || "",
  appId: urlParams.get("appId") || "",
}

// Inisialisasi Firebase di background
if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()

  // Menangani notifikasi background saat browser diminimalkan atau web ditutup
  messaging.onBackgroundMessage(function (payload) {
    console.log("[firebase-messaging-sw.js] Menerima background message:", payload)

    const notificationTitle = payload.notification?.title || payload.data?.title || "Pesan Baru"
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || payload.data?.pesan || "Kamu memiliki pesan baru di LMS.",
      icon: payload.notification?.icon || payload.data?.fotoUrl || "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        url: payload.data?.link || "/murid/kelas",
      },
    }

    self.registration.showNotification(notificationTitle, notificationOptions)
  })
}

// Tangani klik pada notifikasi browser sistem
self.addEventListener("notificationclick", function (event) {
  event.notification.close()
  const targetUrl = event.notification.data?.url || "/murid/kelas"

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url && "focus" in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

