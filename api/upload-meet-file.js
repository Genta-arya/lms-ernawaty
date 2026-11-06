/**
 * Serverless Function: Proxy Upload Berkas Materi Meet ke Cloudinary
 * Endpoint: POST /api/upload-meet-file
 * Mencegah masalah CORS / adblocker / network filter pada browser client
 */

export const config = {
  api: {
    bodyParser: false, // Teruskan raw stream ke Cloudinary
  },
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true")
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
    return res.status(405).json({ error: "Method not allowed. Gunakan POST." })
  }

  const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || "ephsphyt"
  const targetUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`

  try {
    const contentType = req.headers["content-type"] || ""
    
    // Forward request langsung ke Cloudinary
    const cloudinaryRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "content-type": contentType,
      },
      body: req,
      // @ts-ignore
      duplex: "half",
    })

    const data = await cloudinaryRes.json()
    return res.status(cloudinaryRes.status).json(data)
  } catch (error) {
    console.error("Proxy Cloudinary Error:", error)
    return res.status(500).json({
      error: {
        message: error.message || "Gagal mengunggah berkas via proxy server.",
      },
    })
  }
}
