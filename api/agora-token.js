import { RtcTokenBuilder, RtcRole } from "agora-token"

const AGORA_APP_ID = process.env.AGORA_APP_ID || "5960c48ec498439798df7c0d1249ae4d"
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "3adf9df6ca3b43e19f35e5b70705a097"

export default async function handler(req, res) {
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

    // Tentukan role pengguna (PUBLISHER untuk bisa mic/camera)
    const rtcRole = role === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER

    // Durasi token berlaku (misal 24 jam = 86400 detik)
    const expirationTimeInSeconds = 3600 * 24
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    // Buat numerical uid atau gunakan string
    const userUid = uid ? Number(uid) || 0 : 0

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      userUid,
      rtcRole,
      privilegeExpiredTs,
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
