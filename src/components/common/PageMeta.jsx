import React, { useEffect } from "react"
import { useLocation } from "react-router-dom"

const SITE_TITLE = "LMS SMPN 3 Ketapang"

// Mapping judul halaman berdasarkan path statis atau awalan path
const ROUTE_TITLES = {
  // Rute Publik
  "/": `Beranda - ${SITE_TITLE}`,
  "/masuk": `Masuk Portal - ${SITE_TITLE}`,
  "/aktivasi": `Aktivasi Akun Murid - ${SITE_TITLE}`,
  "/mading": `Mading Karya & Kreasi - ${SITE_TITLE}`,
  "/guru/login": `Login Guru & Pengajar - ${SITE_TITLE}`,

  // Rute Murid
  "/murid": `Dashboard Siswa - ${SITE_TITLE}`,
  "/murid/kelas": `Kelas & Ruang Belajar - ${SITE_TITLE}`,
  "/murid/materi": `Materi Pembelajaran - ${SITE_TITLE}`,
  "/murid/mading": `Mading Karya Siswa - ${SITE_TITLE}`,
  "/murid/tugas": `Daftar Tugas Siswa - ${SITE_TITLE}`,
  "/murid/riwayat": `Riwayat Belajar & Nilai - ${SITE_TITLE}`,
  "/murid/profil": `Profil Siswa - ${SITE_TITLE}`,

  // Rute Guru
  "/guru": `Dashboard Guru - ${SITE_TITLE}`,
  "/guru/mading": `Mading & Kreasi - ${SITE_TITLE}`,
  "/guru/profil": `Profil Guru - ${SITE_TITLE}`,
  "/guru/kelas": `Manajemen Kelas - ${SITE_TITLE}`,
  "/guru/murid": `Data Siswa & Murid - ${SITE_TITLE}`,
  "/guru/permintaan": `Permintaan Aktivasi Siswa - ${SITE_TITLE}`,
  "/guru/materi": `Kelola Materi Pembelajaran - ${SITE_TITLE}`,
  "/guru/materi/baru": `Buat Materi Baru - ${SITE_TITLE}`,
  "/guru/kuis": `Bank Soal & Kuis - ${SITE_TITLE}`,
  "/guru/kuis/baru": `Buat Kuis Baru - ${SITE_TITLE}`,
  "/guru/progres": `Progres Belajar Siswa - ${SITE_TITLE}`,
  "/guru/tugas": `Kelola Tugas Siswa - ${SITE_TITLE}`,
  "/guru/tugas/baru": `Buat Tugas Baru - ${SITE_TITLE}`,
  "/guru/pengumuman": `Papan Pengumuman - ${SITE_TITLE}`,
  "/guru/meet": `Sesi Tatap Muka Virtual - ${SITE_TITLE}`,
}

/**
 * Helper untuk menentukan title berdasarkan pola path dinamis
 */
function resolveTitle(pathname) {
  // Cek kecocokan langsung
  if (ROUTE_TITLES[pathname]) {
    return ROUTE_TITLES[pathname]
  }

  // Rute Dinamis Detail
  if (pathname.startsWith("/materi/")) {
    return `Detail Materi - ${SITE_TITLE}`
  }
  if (pathname.startsWith("/murid/tugas/")) {
    return `Detail & Pengumpulan Tugas - ${SITE_TITLE}`
  }
  if (pathname.startsWith("/murid/kuis/")) {
    return `Mengerjakan Kuis - ${SITE_TITLE}`
  }
  if (pathname.startsWith("/murid/hasil/")) {
    return `Hasil & Pembahasan Kuis - ${SITE_TITLE}`
  }
  if (pathname.startsWith("/guru/kelas/")) {
    return `Detail Kelas & Peserta - ${SITE_TITLE}`
  }
  if (pathname.startsWith("/guru/materi/") && pathname.endsWith("/edit")) {
    return `Edit Materi Pembelajaran - ${SITE_TITLE}`
  }
  if (pathname.startsWith("/guru/kuis/") && pathname.endsWith("/edit")) {
    return `Edit Kuis & Butir Soal - ${SITE_TITLE}`
  }
  if (pathname.startsWith("/guru/kuis/") && pathname.endsWith("/hasil")) {
    return `Rekap Hasil & Nilai Kuis - ${SITE_TITLE}`
  }
  if (pathname.startsWith("/guru/tugas/") && pathname.endsWith("/edit")) {
    return `Edit Penugasan - ${SITE_TITLE}`
  }
  if (pathname.startsWith("/guru/tugas/") && pathname.endsWith("/nilai")) {
    return `Penilaian Tugas Siswa - ${SITE_TITLE}`
  }

  return SITE_TITLE
}

/**
 * Komponen PageMeta: Memperbarui title tag halaman secara otomatis sesuai route aktif
 */
export function PageMeta() {
  const location = useLocation()

  useEffect(() => {
    const title = resolveTitle(location.pathname)
    document.title = title
  }, [location.pathname])

  return null
}

/**
 * Komponen pembantu untuk halaman yang ingin override judul secara spesifik
 * Misal: <PageTitle title="Teks Rekon Pribadi" /> -> "Teks Rekon Pribadi - LMS SMPN 3 Ketapang"
 */
export function PageTitle({ title, fullTitle }) {
  useEffect(() => {
    if (fullTitle) {
      document.title = fullTitle
    } else if (title) {
      document.title = `${title} - ${SITE_TITLE}`
    }
  }, [title, fullTitle])

  return null
}
