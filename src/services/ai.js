/**
 * Layanan Generator Materi Berbasis Google Gemini API Resmi
 * Mendukung Round Robin multi-key (6 API Key) dan otomatis failover jika terkena limit.
 */

export const DEFAULT_GEMINI_KEYS = [
  "AQ.Ab8RN6Jp8e28akX-sVvvheXNJiJr5dbp0DmomGCu8-rXEgwr9w", // angel1
  "AQ.Ab8RN6K2-E7IXn5uPs4kvYkwEwR6i72-gAQ2lAJugAE6slHWOA", // angel2
  "AQ.Ab8RN6Kpd46fCYPr6qWxRtattlDmxKEDdDRuOK7b_DQksL-c_A", // angel3
  "AQ.Ab8RN6KTvSoVnNd_f5ZjZdgN2jbD6eDq5yxc3z8UJJBJR8HIpw", // angel4
  "AQ.Ab8RN6K50FVdyRjgWSY1SYCefbJ-KCjvOqhS8l-I32JAtEQOXg", // angel5
  "AQ.Ab8RN6LgSmL3euU13DFSUavhmjqnqSWi4XdJYaeLevfzVk-HYg", // angel6
]

export const GEMINI_CONFIG_KEY = "lsm_gemini_config"
const ROUND_ROBIN_INDEX_KEY = "lsm_gemini_rr_index"

/**
 * Mengambil daftar kunci API yang tersedia
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

  return DEFAULT_GEMINI_KEYS
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

// Model utama: prioritaskan gemini-3.5-flash dan gemini-3.5-flash-lite yang stabil
export const GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
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
        thinkingConfig: {
          thinkingBudget: 0,
        },
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

    throw new Error("Gagal membaca hasil JSON dari AI. Silakan coba lagi.")
  }
}
export async function generateMateriAi({ prompt, mapel = "Bahasa Inggris", fase = "D", tingkat = ["VIII"] }) {
  const keys = getGeminiKeys()

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

  // Jika semua 6 kunci dan model gagal
  throw new Error(lastError?.message || "Server Google Gemini sedang mengalami lonjakan antrian (High Demand). Silakan klik sekali lagi dalam beberapa detik.")
}

/**
 * Generate Kuis Evaluasi Interaktif Otomatis Berbasis Gemini AI
 * Output: objek JSON siap simpan berisi judul, deskripsi, nilaiLulus, dan array soal (pilihan_ganda / benar_salah) lengkap dengan kunci & pembahasan.
 */
export async function generateKuisAi({ prompt, materiJudul = "", jumlahSoal = 5 }) {
  const keys = getGeminiKeys()

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

  throw new Error(lastError?.message || "Server Google Gemini sedang mengalami lonjakan antrian. Silakan coba klik sekali lagi.")
}
