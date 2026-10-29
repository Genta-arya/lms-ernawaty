/**
 * Normalisasi teks jawaban isian singkat (trim, lowercase, hapus spasi berlebih, titik akhir)
 */
export function normalizeText(text) {
  if (typeof text !== "string") return ""
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "") // bersihkan tanda baca umum
    .replace(/\s+/g, " ") // rapikan multi spasi
}

/**
 * Mengevaluasi satu jawaban soal
 */
export function evaluateAnswer(soal, userJawaban) {
  if (userJawaban === undefined || userJawaban === null) {
    return false
  }

  if (soal.tipe === "pilihan_ganda") {
    return String(userJawaban).trim() === String(soal.kunci).trim()
  }

  if (soal.tipe === "benar_salah") {
    // Bisa boolean true/false atau string "true"/"false"
    const parsedUser = typeof userJawaban === "boolean" ? userJawaban : userJawaban === "true"
    const parsedKey = typeof soal.kunci === "boolean" ? soal.kunci : soal.kunci === "true"
    return parsedUser === parsedKey
  }

  if (soal.tipe === "isian") {
    const normalizedUser = normalizeText(userJawaban)
    const validKeys = Array.isArray(soal.kunci) ? soal.kunci : [soal.kunci]
    return validKeys.some((key) => normalizeText(key) === normalizedUser)
  }

  return false
}

/**
 * Menghitung keseluruhan hasil kuis
 */
export function gradeQuiz(soalList, jawabanMap, passingScore = 70) {
  let benarCount = 0
  const detailJawaban = []

  soalList.forEach((soal) => {
    const userJawaban = jawabanMap[soal.id]
    const isBenar = evaluateAnswer(soal, userJawaban)
    if (isBenar) {
      benarCount += 1
    }

    let jawabanTeks = null
    let kunciTeks = null
    if (soal.tipe === "pilihan_ganda" && Array.isArray(soal.opsi)) {
      const selectedOption = soal.opsi.find((o) => o.id === userJawaban)
      jawabanTeks = selectedOption ? selectedOption.teks : null
      const correctOption = soal.opsi.find((o) => o.id === soal.kunci)
      kunciTeks = correctOption ? correctOption.teks : null
    }

    detailJawaban.push({
      soalId: soal.id,
      jawaban: userJawaban !== undefined ? userJawaban : null,
      jawabanTeks,
      kunci: soal.kunci,
      kunciTeks,
      benar: isBenar,
    })
  })

  const total = soalList.length
  const skor = total > 0 ? Math.round((benarCount / total) * 100) : 0
  const lulus = skor >= passingScore

  return {
    skor,
    benar: benarCount,
    total,
    lulus,
    detailJawaban,
  }
}

