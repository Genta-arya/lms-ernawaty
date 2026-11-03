import agoraPkg from "agora-token"

const { RtcTokenBuilder, RtcRole } = agoraPkg.default || agoraPkg

const AGORA_APP_ID = process.env.AGORA_APP_ID || "5960c48ec498439798df7c0d1249ae4d"
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "3adf9df6ca3b43e19f35e5b70705a097"

export default async function handler(req, res) {
  // Aktifkan CORS agar aman dipanggil
  res.setHeader("Access-Control-Allow-Credentials", true)
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  )

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    let body = req.body
    if (typeof body === "string") {
      try {
        body = JSON.parse(body)
      } catch (_) {}
    }

    const { channelName, uid, role } = body || {}

    if (!channelName) {
      return res.status(400).json({ error: "channelName is required" })
    }

    // Role publisher untuk bisa berbicara dan menyalakan kamera
    const rtcRole = role === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER

    // Durasi token berlaku (misal 24 jam)
    const expirationTimeInSeconds = 3600 * 24
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    const userUid = uid ? Number(uid) || 0 : 0

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      userUid,
      rtcRole,
      currentTimestamp,
      privilegeExpiredTs
    )

    return res.status(200).json({
      token,
      appId: AGORA_APP_ID,
      channelName,
      uid: userUid,
      expiresAt: privilegeExpiredTs,
    })
  } catch (error) {
    console.error("Gagal generate Agora token:", error)
    return res.status(500).json({ error: error.message || "Failed to generate token" })
  }
}
