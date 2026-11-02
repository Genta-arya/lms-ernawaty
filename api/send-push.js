import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getMessaging } from "firebase-admin/messaging"

// Inisialisasi Firebase Admin App secara modular & aman
function getAdminApp() {
  const existingApps = getApps()
  if (existingApps.length > 0) {
    return existingApps[0]
  }

  // Ambil credentials dari service account JSON string
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (serviceAccountRaw) {
    try {
      let parsed = null
      if (typeof serviceAccountRaw === "object") {
        parsed = serviceAccountRaw
      } else {
        const cleaned = serviceAccountRaw.trim()
        parsed = JSON.parse(cleaned)
      }

      if (parsed && parsed.private_key) {
        // Normalisasi format newline private key jika di-escape
        if (typeof parsed.private_key === "string" && parsed.private_key.includes("\\n")) {
          parsed.private_key = parsed.private_key.replace(/\\n/g, "\n")
        }
        return initializeApp({
          credential: cert(parsed),
          projectId: parsed.project_id || "lsm-ernawaty",
        })
      }
    } catch (e) {
      console.error("Gagal parse FIREBASE_SERVICE_ACCOUNT_KEY:", e)
    }
  }

  // Fallback default init
  return initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "lsm-ernawaty",
  })
}

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Parse body secara aman jika berupa string
  let bodyData = req.body
  if (typeof bodyData === "string") {
    try {
      bodyData = JSON.parse(bodyData)
    } catch (_) {}
  }

  const { targetUserId, targetNisn, title, body, link, senderName, fotoUrl } = bodyData || {}

  if (!targetUserId && !targetNisn) {
    return res.status(400).json({ error: "targetUserId or targetNisn is required" })
  }

  try {
    const app = getAdminApp()
    const db = getFirestore(app)
    const messaging = getMessaging(app)

    // 1. Ambil token FCM target penerima dari Firestore collection fcmTokens
    const tokens = []
    const tokensSnap = await db.collection("fcmTokens").get()

    tokensSnap.forEach((docSnap) => {
      const data = docSnap.data()
      const matchUser = targetUserId && String(data.userId) === String(targetUserId)
      const matchNisn = targetNisn && String(data.nisn) === String(targetNisn)
      if ((matchUser || matchNisn) && data.token) {
        tokens.push(data.token)
      }
    })

    if (tokens.length === 0) {
      return res.status(200).json({
        success: true,
        sentCount: 0,
        message: "Penerima belum mengaktifkan izin notifikasi push di perangkatnya.",
      })
    }

    // Unikkan token untuk mencegah duplikasi
    const uniqueTokens = Array.from(new Set(tokens))

    // 2. Siapkan payload Push Notification
    const messagePayload = {
      notification: {
        title: title || `Pesan dari ${senderName || "Teman"}`,
        body: body || "Kamu memiliki pesan baru di LMS.",
      },
      data: {
        title: title || `Pesan dari ${senderName || "Teman"}`,
        body: body || "",
        pesan: body || "",
        link: link || "/murid/kelas",
        fotoUrl: fotoUrl || "",
        click_action: link || "/murid/kelas",
      },
      tokens: uniqueTokens,
    }

    // 3. Kirim push notification ke perangkat target via FCM
    const response = await messaging.sendEachForMulticast(messagePayload)

    // Bersihkan token yang sudah expired / tidak valid
    if (response.failureCount > 0) {
      const failedTokens = []
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code
          if (
            errCode === "messaging/invalid-registration-token" ||
            errCode === "messaging/registration-token-not-registered"
          ) {
            failedTokens.push(uniqueTokens[idx])
          }
        }
      })

      // Hapus token expired secara background
      for (const t of failedTokens) {
        db.collection("fcmTokens")
          .where("token", "==", t)
          .get()
          .then((snap) => {
            snap.forEach((d) => d.ref.delete().catch(() => {}))
          })
          .catch(() => {})
      }
    }

    return res.status(200).json({
      success: true,
      sentCount: response.successCount,
      failureCount: response.failureCount,
    })
  } catch (err) {
    console.error("Gagal mengirim push notification:", err)
    return res.status(500).json({ error: err.message || "Internal server error" })
  }
}
