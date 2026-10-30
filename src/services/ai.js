/**
 * Layanan Generator Materi Berbasis Google Gemini API Resmi
 * Mendukung Round Robin multi-key (6 API Key) dan otomatis failover jika terkena limit.
 */

export const GEMINI_CONFIG_KEY = "lsm_gemini_config"
const ROUND_ROBIN_INDEX_KEY = "lsm_gemini_rr_index"

/**
 * Mengambil daftar kunci API Gemini murni dari environment (.env)
 */
export function getGeminiKeys() {
  const envKeys = import.meta.env.VITE_GEMINI_API_KEYS
  if (envKeys) {
    const splitted = envKeys.split(",").map((k) => k.trim()).filter(Boolean)
    if (splitted.length > 0) return splitted
  }

  const saved = localStorage.getItem(GEMINI_CONFIG_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed.keys) && parsed.keys.length > 0) {
        return parsed.keys
      }
    } catch (_) {}
  }

  return []
}

/**
 * Mengambil kunci berikutnya dengan strategi Round Robin
 */
export function getNextApiKey() {
  const keys = getGeminiKeys()
  let currentIndex = parseInt(localStorage.getItem(ROUND_ROBIN_INDEX_KEY) || "0", 10)
  if (isNaN(currentIndex) || currentIndex < 0 || currentIndex >= keys.length) {
    currentIndex = 0
  }

  const selectedKey = keys[currentIndex]
  // Update index ke kunci berikutnya
  localStorage.setItem(ROUND_ROBIN_INDEX_KEY, String((currentIndex + 1) % keys.length))

  return { key: selectedKey, index: currentIndex, total: keys.length }
}

// Model urutan prioritas: gemini-2.5-flash & gemini-2.0-flash yang sangat stabil di API resmi Google AI Studio
export const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-2.5-pro",
]

/**
 * Panggil Google Gemini generateContent API
 */
async function callGeminiApi(apiKey, modelName, systemPrompt, userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\nPermintaan:\n${userPrompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  })

  if (!response.ok) {
    let errMsg = `Gemini API Error (${response.status}: ${response.statusText})`
    try {
      const errJson = await response.json()
      if (errJson?.error?.message) {
        errMsg = errJson.error.message
      }
    } catch (_) {}
    const err = new Error(errMsg)
    err.status = response.status
    throw err
  }

  const data = await response.json()
  const candidate = data?.candidates?.[0]
  const text = candidate?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error("Tidak menerima teks balasan dari Gemini.")
  }

  return text
}

/**
 * Menerjemahkan pesan error teknis menjadi bahasa Indonesia yang ramah, jelas, dan mudah dipahami guru.
 */
export function formatAiFriendlyError(rawError) {
  if (!rawError) {
    return "Maaf Ibu/Bapak Guru, server AI sedang sibuk. Silakan klik tombol 'Coba Lagi' dalam beberapa detik."
  }

  const msg = typeof rawError === "string" ? rawError : rawError.message || String(rawError)
  const lower = msg.toLowerCase()

  if (
    lower.includes("503") ||
    lower.includes("high demand") ||
    lower.includes("unavailable") ||
    lower.includes("overloaded")
  ) {
    return "Server Google Gemini sedang mengalami antrian padat (ramai pengguna). Mohon Ibu/Bapak Guru menunggu 3-5 detik lalu klik 'Coba Lagi'."
  }

  if (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("resource_exhausted")
  ) {
    return "Batas frekuensi permintaan AI telah tercapai untuk sementara waktu. Mohon tunggu sekitar 10 detik lalu silakan coba lagi."
  }

  if (
    lower.includes("api_key") ||
    lower.includes("key not valid") ||
    lower.includes("invalid api key") ||
    lower.includes("expired")
  ) {
    return "Kunci API Gemini tidak valid atau telah kedaluwarsa. Silakan periksa pengaturan kunci API Anda atau coba lagi."
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("internet") ||
    lower.includes("offline")
  ) {
    return "Koneksi internet terputus atau lambat saat menghubungi AI. Pastikan perangkat Anda terhubung ke internet lalu klik 'Coba Lagi'."
  }

  if (lower.includes("json") || lower.includes("parse") || lower.includes("format")) {
    return "AI sempat terpotong saat menyusun format materi/soal. Silakan klik tombol 'Coba Lagi' untuk menyusun ulang otomatis."
  }

  return "Maaf Ibu/Bapak Guru, terjadi kendala saat membuat materi otomatis. Silakan periksa koneksi Anda dan coba klik lagi."
}

/**
 * Helper untuk mem-parsing JSON AI secara aman bahkan jika terpotong oleh token limit
 */
function safeParseJson(rawText) {
  let clean = rawText.trim()
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
  }

  try {
    return JSON.parse(clean)
  } catch (err) {
    console.warn("Mencoba auto-repair JSON terpotong...", err.message)
    // Jika array soal terpotong di tengah jalan: cari objek soal terakhir yang lengkap
    const lastSoalEnd = clean.lastIndexOf('},\n    {')
    if (lastSoalEnd !== -1) {
      const repaired = clean.substring(0, lastSoalEnd + 1) + "\n  ]\n}"
      try {
        return JSON.parse(repaired)
      } catch (_) {}
    }

    // Coba tutup kurung array dan kurung kurawal
    const lastValidBrace = clean.lastIndexOf('}')
    if (lastValidBrace !== -1) {
      const repaired = clean.substring(0, lastValidBrace + 1) + "\n  ]\n}"
      try {
        return JSON.parse(repaired)
      } catch (_) {}
    }

    throw new Error("AI sempat terpotong saat menyusun format. Silakan klik tombol Coba Lagi.")
  }
}
export async function generateMateriAi({ prompt, mapel = "Bahasa Inggris", fase = "D", tingkat = ["VIII"] }) {
  const keys = getGeminiKeys()
  if (!keys || keys.length === 0) {
    throw new Error("Kunci API Gemini tidak ditemukan. Pastikan VITE_GEMINI_API_KEYS sudah terisi di file .env")
  }

  const systemPrompt = `Anda adalah asisten pakar kurikulum Kurikulum Merdeka (Fase D SMP).
Buat satu paket modul pembelajaran yang padat, terstruktur, edukatif, dan ramah siswa sesuai permintaan guru.

Format keluaran HARUS berupa objek JSON valid dengan skema berikut:
{
  "judul": "Judul materi yang menarik",
  "slug": "slug-url-dari-judul",
  "topik": "Topik utama",
  "mapel": "${mapel}",
  "fase": "${fase}",
  "tingkat": ${JSON.stringify(tingkat)},
  "urutan": 1,
  "status": "draft",
  "deskripsi": "Ringkasan pengantar singkat modul (1-2 kalimat)",
  "tujuan": [
    "Tujuan pembelajaran 1",
    "Tujuan pembelajaran 2",
    "Tujuan pembelajaran 3",
    "Tujuan pembelajaran 4"
  ],
  "bagian": [
    {
      "id": "b1",
      "judul": "1. Konsep & Pengertian Dasar",
      "jenis": "pengantar",
      "urutan": 1,
      "konten": "Isi materi dalam format Markdown lengkap dengan heading ##, poin-poin penting, dan penjelasan kontekstual."
    },
    {
      "id": "b2",
      "judul": "2. Struktur & Ciri Kebahasaan",
      "jenis": "struktur",
      "urutan": 2,
      "konten": "Pembahasan rinci dalam bentuk tabel Markdown atau formula tata bahasa yang mudah dipahami."
    },
    {
      "id": "b3",
      "judul": "3. Contoh Teks Nyata & Analisis",
      "jenis": "contoh",
      "urutan": 3,
      "konten": "Contoh teks lengkap beserta bedah strukturnya dalam format Markdown."
    },
    {
      "id": "b4",
      "judul": "4. Rangkuman & Refleksi Mandiri",
      "jenis": "rangkuman",
      "urutan": 4,
      "konten": "Rangkuman poin inti dan 2-3 pertanyaan refleksi mandiri untuk siswa."
    }
  ]
}

PENTING:
- Keluarkan HANYA JSON murni yang dapat langsung di-parse oleh JSON.parse().
- Jangan sertakan teks obrolan apapun.`

  const userPrompt = `Buatkan modul materi lengkap mata pelajaran ${mapel} Fase D (Tingkat: ${tingkat.join(", ")}):
"${prompt}"`

  // Coba API Keys dengan Round Robin
  let lastError = null
  const startIndex = parseInt(localStorage.getItem(ROUND_ROBIN_INDEX_KEY) || "0", 10) % keys.length

  for (let i = 0; i < keys.length; i++) {
    const keyIndex = (startIndex + i) % keys.length
    const currentApiKey = keys[keyIndex]

    // Coba model: jika gemini-3.8-flash terkena 503 (high demand), seketika coba gemini-3.5-flash-lite
    for (const modelToTry of GEMINI_MODELS) {
      try {
        localStorage.setItem(ROUND_ROBIN_INDEX_KEY, String((keyIndex + 1) % keys.length))

        const rawJson = await callGeminiApi(currentApiKey, modelToTry, systemPrompt, userPrompt)
        return safeParseJson(rawJson)
      } catch (err) {
        lastError = err
        const is503 = err.status === 503 || err.message?.includes("503") || err.message?.includes("high demand") || err.message?.includes("UNAVAILABLE")
        if (is503) {
          console.warn(`Model ${modelToTry} sedang 503 (high demand), langsung beralih ke model cadangan...`)
          continue // coba model berikutnya di daftar GEMINI_MODELS
        }
        // Jika error non-503 (misal kuota key habis), lanjut ke key berikutnya
        console.warn(`Gemini Key #${keyIndex + 1} (${modelToTry}) kendala:`, err.message)
        break
      }
    }
  }

  // Jika semua kunci dan model gagal
  throw new Error(formatAiFriendlyError(lastError))
}

/**
 * Generate Kuis Evaluasi Interaktif Otomatis Berbasis Gemini AI
 * Output: objek JSON siap simpan berisi judul, deskripsi, nilaiLulus, dan array soal (pilihan_ganda / benar_salah) lengkap dengan kunci & pembahasan.
 */
export async function generateKuisAi({ prompt, materiJudul = "", jumlahSoal = 5 }) {
  const keys = getGeminiKeys()
  if (!keys || keys.length === 0) {
    throw new Error("Kunci API Gemini tidak ditemukan. Pastikan VITE_GEMINI_API_KEYS sudah terisi di file .env")
  }

  const systemPrompt = `Anda adalah asisten pembuat soal dan evaluasi pembelajaran Kurikulum Merdeka (Fase D SMP).
Tugas Anda adalah membuat satu set kuis/latihan formatif interaktif lengkap dengan opsi jawaban, kunci jawaban yang tepat, dan pembahasan edukatif.

Format keluaran HARUS berupa objek JSON valid TANPA markdown backtick di luarnya, dengan skema berikut:
{
  "judul": "Judul Kuis yang Jelas (misal: Kuis Formatif: Recount Text)",
  "deskripsi": "Deskripsi singkat latihan pemahaman materi.",
  "nilaiLulus": 70,
  "acakSoal": true,
  "acakOpsi": true,
  "maksPercobaan": null,
  "status": "draft",
  "soal": [
    {
      "id": "s_1",
      "tipe": "pilihan_ganda",
      "pertanyaan": "Teks pertanyaan jelas dan lugas?",
      "opsi": [
        { "id": "a", "teks": "Pilihan A" },
        { "id": "b", "teks": "Pilihan B" },
        { "id": "c", "teks": "Pilihan C" },
        { "id": "d", "teks": "Pilihan D" }
      ],
      "kunci": "b",
      "pembahasan": "Alasan singkat dan mendidik mengapa opsi b benar."
    },
    {
      "id": "s_2",
      "tipe": "benar_salah",
      "pertanyaan": "Pernyataan evaluasi yang dapat dinilai Benar atau Salah.",
      "kunci": true,
      "pembahasan": "Penjelasan mengapa pernyataan ini benar."
    }
  ]
}

PENTING:
- Buat sekitar ${jumlahSoal} butir soal berkualitas (kombinasi pilihan ganda 4 opsi dan benar/salah).
- Untuk tipe "pilihan_ganda", kunci bernilai "a", "b", "c", atau "d".
- Untuk tipe "benar_salah", kunci bernilai boolean (true atau false).
- Sertakan pembahasan yang ringkas dan mendidik di setiap butir soal.
- Keluarkan HANYA JSON murni yang dapat di-parse oleh JSON.parse().`

  const userPrompt = `Buatkan ${jumlahSoal} butir soal kuis interaktif untuk siswa SMP Fase D.
${materiJudul ? `Terkait materi: "${materiJudul}"\n` : ""}Permintaan guru:
"${prompt}"`

  let lastError = null
  const startIndex = parseInt(localStorage.getItem(ROUND_ROBIN_INDEX_KEY) || "0", 10) % keys.length

  for (let i = 0; i < keys.length; i++) {
    const keyIndex = (startIndex + i) % keys.length
    const currentApiKey = keys[keyIndex]

    for (const modelToTry of GEMINI_MODELS) {
      try {
        localStorage.setItem(ROUND_ROBIN_INDEX_KEY, String((keyIndex + 1) % keys.length))

        const rawJson = await callGeminiApi(currentApiKey, modelToTry, systemPrompt, userPrompt)
        return safeParseJson(rawJson)
      } catch (err) {
        lastError = err
        const is503 = err.status === 503 || err.message?.includes("503") || err.message?.includes("high demand") || err.message?.includes("UNAVAILABLE")
        if (is503) {
          console.warn(`Model ${modelToTry} sedang 503, mencoba model cadangan...`)
          continue
        }
        console.warn(`Gemini Key #${keyIndex + 1} (${modelToTry}) kendala:`, err.message)
        break
      }
    }
  }

  throw new Error(formatAiFriendlyError(lastError))
}
