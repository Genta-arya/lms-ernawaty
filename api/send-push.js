import admin from "firebase-admin"

// Inisialisasi Firebase Admin jika belum terinisialisasi
function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin
  }

  // Coba ambil credentials dari service account JSON string atau base64
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
        // Normalisasi format private key newline jika di-escape
        if (typeof parsed.private_key === "string" && parsed.private_key.includes("\\n")) {
          parsed.private_key = parsed.private_key.replace(/\\n/g, "\n")
        }
        admin.initializeApp({
          credential: admin.credential.cert(parsed),
        })
        return admin
      }
    } catch (e) {
      console.error("Gagal parse FIREBASE_SERVICE_ACCOUNT_KEY:", e)
    }
  }

  // Fallback ke default initialization (menggunakan project ID)
  try {
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || "lsm-ernawaty",
    })
  } catch (e) {
    console.error("Default admin init warning:", e)
  }

  return admin
}

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { targetUserId, targetNisn, title, body, link, senderName, fotoUrl } = req.body || {}

  if (!targetUserId && !targetNisn) {
    return res.status(400).json({ error: "targetUserId or targetNisn is required" })
  }

  try {
    const firebaseAdmin = getFirebaseAdmin()
    const db = firebaseAdmin.firestore()

    // 1. Ambil token FCM target penerima dari Firestore collection fcmTokens
    const tokens = []
    const tokensSnap = await db.collection("fcmTokens").get()

    tokensSnap.forEach((doc) => {
      const data = doc.data()
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
    const response = await firebaseAdmin.messaging().sendEachForMulticast(messagePayload)

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

