import Papa from "papaparse"

/**
 * Parsing CSV murid
 * Format: nisn,nama,kelas,email
 */
export function parseMuridCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        const rows = results.data
        const validRows = []
        const errorRows = []

        rows.forEach((row, index) => {
          const nisn = (row.nisn || "").toString().trim()
          const nama = (row.nama || "").trim()
          const kelas = (row.kelas || "").trim()
          const email = (row.email || "").trim().toLowerCase()

          const errors = []
          if (!nisn) {
            errors.push("NISN wajib diisi")
          } else if (!/^\d{10}$/.test(nisn)) {
            errors.push("NISN harus tepat 10 digit angka")
          }

          if (!nama) {
            errors.push("Nama wajib diisi")
          }

          if (!kelas) {
            errors.push("Kelas wajib diisi")
          }

          if (errors.length > 0) {
            errorRows.push({ rowNumber: index + 2, row, errors })
          } else {
            validRows.push({
              nisn,
              nama,
              kelas,
              email: email || null,
            })
          }
        })

        resolve({ validRows, errorRows })
      },
      error: (err) => reject(err),
    })
  })
}

/**
 * Ekspor data ke file CSV yang dapat diunduh langsung di browser
 */
export function exportToCsv(filename, data) {
  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

