import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

// Inisialisasi Firebase Admin App
function getAdminApp() {
  const existingApps = getApps()
  if (existingApps.length > 0) {
    return existingApps[0]
  }

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

  return initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "lsm-ernawaty",
  })
}

/**
 * Serverless / Cron handler untuk otomatis menyelesaikan / mematikan sesi meet
 * yang sudah lewat tanggal atau batas durasi wajarnya.
 */
export default async function handler(req, res) {
  // Verifikasi otorisasi Cron Vercel (jika CRON_SECRET di-set)
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.authorization
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Tetap izinkan GET jika dipanggil oleh Vercel cron internal
    const vercelCronHeader = req.headers["x-vercel-cron"]
    if (!vercelCronHeader) {
      return res.status(401).json({ error: "Unauthorized cron request" })
    }
  }

  try {
    const adminApp = getAdminApp()
    const db = getFirestore(adminApp)

    const now = new Date()
    // Hitung awal hari ini (pukul 00:00:00 waktu lokal)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    // Sesi yang sudah berjalan lebih dari 8 jam juga dianggap kedaluwarsa otomatis
    const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000)

    const updatedSessions = []

    // 1. Ambil semua sesi yang statusnya BUKAN "selesai" (yaitu "berlangsung" atau "terjadwal")
    const snapshot = await db
      .collection("sesiMeet")
      .where("status", "in", ["berlangsung", "terjadwal"])
      .get()

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        message: "Tidak ada sesi meet aktif atau terjadwal yang perlu ditutup.",
        closedCount: 0,
        timestamp: now.toISOString(),
      })
    }

    const batch = db.batch()
    let batchCount = 0

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data()
      let sessionDate = null

      if (data.waktuMulai) {
        if (typeof data.waktuMulai.toDate === "function") {
          sessionDate = data.waktuMulai.toDate()
        } else {
          sessionDate = new Date(data.waktuMulai)
        }
      } else if (data.createdAt) {
        if (typeof data.createdAt.toDate === "function") {
          sessionDate = data.createdAt.toDate()
        } else {
          sessionDate = new Date(data.createdAt)
        }
      }

      if (!sessionDate || isNaN(sessionDate.getTime())) {
        return
      }

      // Kriteria penutupan otomatis:
      // A. Tanggal jadwal sesi sudah sebelum hari ini (kemarin atau sebelumnya)
      const isPastDay = sessionDate.getTime() < startOfToday.getTime()

      // B. Sesi sedang "berlangsung" tetapi sudah berjalan lebih dari 8 jam (lupa dimatikan oleh guru)
      const isExpiredLive = data.status === "berlangsung" && sessionDate.getTime() < eightHoursAgo.getTime()

      if (isPastDay || isExpiredLive) {
        const docRef = db.collection("sesiMeet").doc(docSnap.id)
        batch.update(docRef, {
          status: "selesai",
          selesaiAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          alasanSelesai: isPastDay ? "Otomatis ditutup: Tanggal sesi telah lewat" : "Otomatis ditutup: Batas waktu maksimal sesi terlampaui",
        })

        updatedSessions.push({
          id: docSnap.id,
          judul: data.judul,
          statusSebelumnya: data.status,
          waktuMulai: sessionDate.toISOString(),
          alasan: isPastDay ? "Lewat tanggal" : "Durasi > 8 jam",
        })
        batchCount++
      }
    })

    if (batchCount > 0) {
      await batch.commit()
    }

    return res.status(200).json({
      success: true,
      message: `Berhasil memeriksa dan menutup ${batchCount} sesi meet yang telah kedaluwarsa.`,
      closedCount: batchCount,
      closedSessions: updatedSessions,
      checkedAt: now.toISOString(),
    })
  } catch (error) {
    console.error("Error pada cron cleanup sesi meet:", error)
    return res.status(500).json({
      error: "Gagal menjalankan cronjob penutupan sesi meet.",
      details: error.message,
    })
  }
}

