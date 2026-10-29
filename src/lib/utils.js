import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp) {
  if (!timestamp) return "-"
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

/**
 * Normalisasi label kelas menjadi format ramah pengguna (contoh: "Kelas VIII B")
 * Mencegah bocornya ID dokumen Firestore acak (contoh: "Kelas o7q1galXdf8BtgKr7qMa")
 */
export function formatNamaKelas(rawKelas, kelasMap = {}) {
  if (!rawKelas) return "Pelajar"
  let str = String(rawKelas).trim()

  // Jika cocok langsung di kelasMap
  if (kelasMap[str]) return kelasMap[str]

  // Jika diawali "Kelas " diikuti ID dokumen panjang (>= 15 karakter)
  if (str.startsWith("Kelas ")) {
    const sisa = str.replace("Kelas ", "").trim()
    if (kelasMap[sisa]) return kelasMap[sisa]
    if (sisa.length >= 15) {
      // Ini adalah doc ID Firestore yang belum ter-resolve
      return Object.values(kelasMap)[0] || "Kelas Murid"
    }
    return str
  }

  // Jika string tanpa "Kelas " tapi merupakan ID dokumen panjang
  if (str.length >= 15) {
    if (kelasMap[str]) return kelasMap[str]
    return Object.values(kelasMap)[0] || "Kelas Murid"
  }

  // Jika sudah berformat "VIII A" atau "VII B", tambahkan "Kelas "
  if (/^(VII|VIII|IX|[789])\s*[A-Z]?$/i.test(str)) {
    return str.startsWith("Kelas ") ? str : `Kelas ${str}`
  }

  return str.startsWith("Kelas ") ? str : `Kelas ${str}`
}
export function normalizeTingkatRomawi(val) {
  if (!val) return null
  const str = String(val).toUpperCase().trim()
  if (
    str.includes("VIII") ||
    str === "8" ||
    str.startsWith("8") ||
    str.includes("KELAS 8") ||
    str.includes("KELAS VIII")
  ) {
    return "VIII"
  }
  if (
    str.includes("VII") ||
    str === "7" ||
    str.startsWith("7") ||
    str.includes("KELAS 7") ||
    str.includes("KELAS VII")
  ) {
    return "VII"
  }
  if (
    str.includes("IX") ||
    str === "9" ||
    str.startsWith("9") ||
    str.includes("KELAS 9") ||
    str.includes("KELAS IX")
  ) {
    return "IX"
  }
  return null
}

/**
 * Cek apakah materi cocok untuk tingkat kelas siswa tertentu
 */
export function isMateriCocokTingkat(materiTingkat, studentTingkat) {
  if (!studentTingkat) return true
  const normStudent = normalizeTingkatRomawi(studentTingkat)
  if (!normStudent) return true

  if (!materiTingkat || !Array.isArray(materiTingkat) || materiTingkat.length === 0) {
    return true
  }

  const normalizedList = materiTingkat.map((t) => normalizeTingkatRomawi(t))
  return normalizedList.includes(normStudent)
}

