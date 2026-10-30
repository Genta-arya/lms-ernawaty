import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useAuth } from "@/context/AuthContext"
import { UserAvatar } from "@/components/common/UserAvatar"
import { getMateriList } from "@/services/materi"
import { getKuisList } from "@/services/kuis"
import { getProgresMurid } from "@/services/progres"
import { getPercobaanByMurid } from "@/services/percobaan"
import { getKelasById } from "@/services/kelas"
import { getGuruUtama } from "@/services/guru"
import { getTugasList, getPengumpulanByMurid } from "@/services/tugas"
import { getPengumumanList, subscribePengumumanList } from "@/services/pengumuman"
import { getKaryaList } from "@/services/karya"
import { LeaderboardHarian } from "@/components/kuis/LeaderboardHarian"
import { MadingCarousel } from "@/components/mading/MadingCarousel"
import { formatDate } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardMuridSkeleton } from "@/components/ui/loading-skeletons"
import { PengumumanCarousel } from "@/components/pengumuman/PengumumanCarousel"
import {
  BookOpen,
  FileQuestion,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Trophy,
  Search,
  Filter,
  Check,
  X,
  Edit3,
  ClipboardList,
  Megaphone,
  AlertCircle,
  GraduationCap,
  Award,
  Feather,
  History,
  User,
  Heart,
  MessageSquare,
  LayoutGrid,
} from "lucide-react"

export function Dashboard() {
  const { currentUser, profileData } = useAuth()
  const [imgError, setImgError] = useState(false)
  const [kelasData, setKelasData] = useState(null)
  const [guruData, setGuruData] = useState(null)
  const [materiList, setMateriList] = useState([])
  const [kuisList, setKuisList] = useState([])
  const [progresMap, setProgresMap] = useState({})
  const [percobaanList, setPercobaanList] = useState([])
  const [tugasList, setTugasList] = useState([])
  const [mySubmissions, setMySubmissions] = useState([])
  const [pengumumanList, setPengumumanList] = useState([])
  const [karyaList, setKaryaList] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter Search & Status Selesai
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("semua") // "semua" | "selesai" | "belum"

  // Otomatis scroll ke paling atas saat halaman beranda siswa dibuka
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

  useEffect(() => {
    async function loadData() {
      if (!currentUser) return
      setLoading(true)

      try {
        // Ambil data secara resilient (Promise.allSettled)
        const results = await Promise.allSettled([
          getMateriList(false),
          getKuisList(false),
          getProgresMurid(currentUser.uid),
          getPercobaanByMurid(currentUser.uid),
          profileData?.kelasId ? getKelasById(profileData.kelasId) : Promise.resolve(null),
          getGuruUtama(),
          getTugasList(false, null, profileData?.kelasId || null),
          getPengumpulanByMurid(currentUser.uid),
          getPengumumanList(false),
          getKaryaList(),
        ])

        if (results[0].status === "fulfilled") setMateriList(results[0].value || [])
        if (results[1].status === "fulfilled") setKuisList(results[1].value || [])
        if (results[2].status === "fulfilled") setProgresMap(results[2].value || {})
        if (results[3].status === "fulfilled") setPercobaanList(results[3].value || [])
        if (results[4].status === "fulfilled" && results[4].value) setKelasData(results[4].value)
        if (results[5].status === "fulfilled" && results[5].value) setGuruData(results[5].value)
        if (results[6].status === "fulfilled") setTugasList(results[6].value || [])
        if (results[7].status === "fulfilled") setMySubmissions(results[7].value || [])
        if (results[8].status === "fulfilled") setPengumumanList(results[8].value || [])
        if (results[9].status === "fulfilled") setKaryaList(results[9].value || [])
      } catch (err) {
        console.error("Gagal memuat portal murid:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [currentUser, profileData])

  // Penentuan tingkat kelas siswa
  const tingkatRaw = kelasData?.tingkat || profileData?.tingkat || profileData?.kelasNama
  const tingkatNum = Number(tingkatRaw)
  const tingkatRomawi =
    tingkatNum === 7 || tingkatRaw === "VII" || String(tingkatRaw || "").includes("7") || String(tingkatRaw || "").includes("VII")
      ? "VII"
      : tingkatNum === 8 || tingkatRaw === "VIII" || String(tingkatRaw || "").includes("8") || String(tingkatRaw || "").includes("VIII")
        ? "VIII"
        : tingkatNum === 9 || tingkatRaw === "IX" || String(tingkatRaw || "").includes("9") || String(tingkatRaw || "").includes("IX")
          ? "IX"
          : null

  // Realtime subscription ke Firebase Realtime Database untuk pengumuman live
  useEffect(() => {
    const unsub = subscribePengumumanList(
      (liveList) => {
        setPengumumanList(liveList)
      },
      false,
      tingkatRomawi
    )
    return () => unsub()
  }, [tingkatRomawi])

  // Mapping skor terbaik per kuisId
  const bestScoreMap = new Map()
  percobaanList.forEach((p) => {
    const existing = bestScoreMap.get(p.kuisId)
    if (!existing || p.skor > existing.skor) {
      bestScoreMap.set(p.kuisId, p)
    }
  })

  // Filter materi sesuai tingkat kelas siswa, pencarian teks, dan status selesai
  const filteredMateri = materiList.filter((m) => {
    // 1. Filter tingkat kelas
    if (tingkatRomawi && m.tingkat && m.tingkat.length > 0 && !m.tingkat.includes(tingkatRomawi)) {
      return false
    }

    // 2. Filter search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchJudul = m.judul?.toLowerCase().includes(q)
      const matchDeskripsi = m.deskripsi?.toLowerCase().includes(q)
      const matchTopik = m.topik?.toLowerCase().includes(q)
      if (!matchJudul && !matchDeskripsi && !matchTopik) return false
    }

    // 3. Filter status selesai
    const isRead = !!progresMap[m.id]
    if (statusFilter === "selesai" && !isRead) return false
    if (statusFilter === "belum" && isRead) return false

    return true
  })

  // Filter kuis sesuai tingkat kelas siswa dan materi referensinya
  const filteredKuis = kuisList.filter((k) => {
    // 1. Cek tingkat langsung di kuis
    if (tingkatRomawi && k.tingkat && k.tingkat.length > 0 && !k.tingkat.includes(tingkatRomawi)) {
      return false
    }
    // 2. Cek tingkat pada materi referensi kuis
    if (k.materiId) {
      const refMateri = materiList.find((m) => m.id === k.materiId)
      if (refMateri && tingkatRomawi && refMateri.tingkat && refMateri.tingkat.length > 0) {
        if (!refMateri.tingkat.includes(tingkatRomawi)) {
          return false
        }
      }
    }
    return true
  })

  // Mapping pengumpulan tugas murid: tugasId -> submission
  const mySubmissionMap = new Map()
  mySubmissions.forEach((s) => {
    mySubmissionMap.set(s.tugasId, s)
  })

  // Filter pengumuman aktif sesuai tingkat kelas siswa
  const activeAnnouncements = pengumumanList.filter((p) => {
    if (p.status !== "aktif") return false
    if (!p.tingkat || p.tingkat.includes("SEMUA") || p.tingkat.length === 0) return true
    if (tingkatRomawi) {
      return p.tingkat.includes(tingkatRomawi)
    }
    return true
  })

  // Filter tugas aktif sesuai target kelas spesifik dan tingkat kelas siswa
  const filteredTugas = tugasList.filter((t) => {
    // 1. Jika tugas menargetkan kelas-kelas spesifik
    if (t.kelasIds && Array.isArray(t.kelasIds) && t.kelasIds.length > 0) {
      if (profileData?.kelasId) {
        return t.kelasIds.includes(profileData.kelasId)
      }
      // Jika murid belum ada kelasId, cek kecocokan tingkat romawi
      return tingkatRomawi && t.tingkat && t.tingkat.length > 0 ? t.tingkat.includes(tingkatRomawi) : true
    }

    // 2. Filter tingkat kelas
    if (tingkatRomawi && t.tingkat && t.tingkat.length > 0 && !t.tingkat.includes(tingkatRomawi)) {
      return false
    }
    return true
  })

  if (loading) {
    return <DashboardMuridSkeleton />
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Profil Murid - Minimalis, Elegan & Nama Tidak Terpotong */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          {/* Avatar & Sapaan Siswa */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <Link
              to="/murid/profil"
              title="Buka Profil Siswa"
              className="relative group shrink-0"
            >
              <UserAvatar
                fotoUrl={profileData?.fotoUrl || currentUser?.photoURL}
                nama={profileData?.nama || currentUser?.displayName || "Siswa"}
                size="md"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ring-2 ring-slate-100 shadow-2xs group-hover:scale-105 transition-transform"
                fallbackClassName="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg sm:text-xl"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
                  Portal Belajar
                </span>
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {kelasData ? `Kelas ${kelasData.nama}` : (profileData?.kelasNama || "Fase D")}
                </span>
              </div>

              {/* Nama Lengkap Siswa - Tampil Utuh Tanpa Terpotong */}
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug break-words">
                Halo, {profileData?.nama || "Siswa"}!
              </h1>
            </div>
          </div>

          {/* Stat Kuis Mini di Sudut Kanan */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-50 border border-amber-200/80 shrink-0">
            <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-right">
              <span className="font-black text-amber-950 text-xs sm:text-sm block leading-none">{bestScoreMap.size}</span>
              <span className="text-[9px] text-amber-700 font-semibold block leading-none mt-0.5">Kuis</span>
            </div>
          </div>
        </div>

        {/* Baris Informasi Akademik (NISN & Mata Pelajaran) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-2.5 border-t border-slate-100">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            NISN: <span className="font-mono text-slate-800 font-bold">{profileData?.nisn || "-"}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            Mata Pelajaran: <span className="text-slate-800 font-semibold">{guruData?.mapel || "Bahasa Indonesia"}</span>
          </span>
        </div>
      </div>

      {/* BANNER CAROUSEL PENGUMUMAN DARI IBU GURU */}
      {activeAnnouncements.length > 0 && (
        <PengumumanCarousel announcements={activeAnnouncements} />
      )}

      {/* ── FITUR MENU CEPAT MOBILE ALA SHOPEE (KHUSUS TAMPILAN MOBILE - GRID 2 BARIS) ── */}
      <div className="md:hidden bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3.5">
        {/* Label Header Menu Utama */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4 text-blue-600 stroke-[2.5]" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Menu Utama
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Fitur Belajar
          </span>
        </div>

        <div className="grid grid-cols-4 gap-y-4 gap-x-2 text-center">
          {/* Menu 1: Materi Belajar */}
          <Link
            to="/murid/materi"
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl active:scale-95 transition-all group"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-black text-slate-800 leading-tight">
              Materi
            </span>
          </Link>

          {/* Menu 2: Tugas Mandiri */}
          <Link
            to="/murid/tugas"
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl active:scale-95 transition-all group relative"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform relative">
              <ClipboardList className="w-6 h-6 stroke-[2.2]" />
              {filteredTugas.filter((t) => !mySubmissionMap.has(t.id)).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-black flex items-center justify-center ring-2 ring-white animate-pulse">
                  {filteredTugas.filter((t) => !mySubmissionMap.has(t.id)).length}
                </span>
              )}
            </div>
            <span className="text-[11px] font-black text-slate-800 leading-tight">
              Tugas
            </span>
          </Link>

          {/* Menu 3: Pojok Kreasi (Mading) */}
          <Link
            to="/mading"
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl active:scale-95 transition-all group"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <Feather className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-black text-slate-800 leading-tight">
              Kreasi
            </span>
          </Link>

          {/* Menu 4: Riwayat Belajar & Nilai */}
          <Link
            to="/murid/riwayat"
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl active:scale-95 transition-all group"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <History className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-black text-slate-800 leading-tight">
              Riwayat
            </span>
          </Link>

          {/* ── BARIS KEDUA ── */}

          {/* Menu 5: Kuis Latihan */}
          <Link
            to="/murid/materi"
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl active:scale-95 transition-all group relative"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
              <FileQuestion className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-black text-slate-800 leading-tight">
              Kuis
            </span>
          </Link>

          {/* Menu 6: Peringkat Kelas / Leaderboard */}
          <a
            href="#peringkat-skor"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById("peringkat-skor")?.scrollIntoView({ behavior: "smooth" })
            }}
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl active:scale-95 transition-all group"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Trophy className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-black text-slate-800 leading-tight">
              Peringkat
            </span>
          </a>

          {/* Menu 7: Pengumuman Sekolah */}
          <a
            href="#pengumuman-guru"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl active:scale-95 transition-all group relative"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform relative">
              <Megaphone className="w-6 h-6 stroke-[2.2]" />
              {activeAnnouncements.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </div>
            <span className="text-[11px] font-black text-slate-800 leading-tight">
              Info Guru
            </span>
          </a>

          {/* Menu 8: Profil Siswa */}
          <Link
            to="/murid/profil"
            className="flex flex-col items-center gap-1.5 p-1 rounded-2xl active:scale-95 transition-all group"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-slate-600 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-700/20 group-hover:scale-105 transition-transform">
              <User className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-black text-slate-800 leading-tight">
              Profil
            </span>
          </Link>
        </div>
      </div>

      {/* ── KONTEN KHUSUS MOBILE: MADING KREASI & PERINGKAT SKOR KUIS ── */}
      <div className="md:hidden space-y-6">
        {/* 1. Mading Kreasi Siswa (Carousel Maksimal 3 Karya dengan Isi Lengkap) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80">
                <Feather className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                  Mading Kreasi Siswa
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Karya puisi, pantun & tulisan kreatif teman-teman
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-xs text-rose-600 font-bold hover:text-rose-700 h-7 px-2"
            >
              <Link to="/mading">
                <span>Buka Mading</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </Button>
          </div>

          {/* Komponen Mading Carousel */}
          <MadingCarousel karyaList={karyaList} />
        </div>

        {/* 2. Papan Peringkat Skor Kuis Hari Ini */}
        <div id="peringkat-skor" className="space-y-3 scroll-mt-20">
          <LeaderboardHarian title="Peringkat Skor Kuis" />
        </div>
      </div>

      {/* Label Penting Kuis Latihan */}
      <div className="hidden md:flex p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs items-center gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <b>Catatan Belajar:</b> Kuis dalam portal ini bersifat <b>kuis latihan formatif</b>. Kamu dapat membaca materi terlebih dahulu lalu berlatih kuis untuk menguji pemahaman dan melihat pembahasannya.
        </div>
      </div>

      {/* Grid: Materi Pembelajaran (Hanya tampil di Desktop, karena di Mobile sudah ada menu khusus Materi) */}
      <div className="hidden md:block space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Materi Pembelajaran</h2>
            <p className="text-xs text-muted-foreground">Baca dan pelajari materi sebelum mengerjakan kuis latihan.</p>
          </div>
          {tingkatRomawi && (
            <Badge variant="outline" className="text-xs font-semibold bg-slate-50">
              Materi Kelas {tingkatRomawi}
            </Badge>
          )}
        </div>

        {/* Bar Filter Pencarian & Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          {/* Input Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari topik atau judul materi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Status (Semua, Selesai, Belum Selesai) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            {[
              { id: "semua", label: "Semua" },
              { id: "selesai", label: "Selesai" },
              { id: "belum", label: "Belum Selesai" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${statusFilter === st.id
                  ? "bg-white text-blue-600 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {filteredMateri.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-2xl bg-slate-50/50">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="font-bold text-slate-700 text-sm">Tidak ada materi yang sesuai</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery || statusFilter !== "semua"
                ? "Coba sesuaikan kata kunci pencarian atau ubah filter status."
                : "Guru belum mengubah status materi menjadi terbit."}
            </p>
            {(searchQuery || statusFilter !== "semua") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("semua")
                }}
                className="mt-3 text-xs h-8"
              >
                Reset Filter
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredMateri.map((materi) => {
              const isRead = !!progresMap[materi.id]
              return (
                <Card key={materi.id} className="flex flex-col hover:border-primary/50 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {materi.topik || "Recount"}
                      </Badge>
                      {isRead ? (
                        <Badge variant="success" className="text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Selesai Dibaca
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Belum Selesai
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base font-bold line-clamp-2">
                      <Link to={`/materi/${materi.slug}`} className="hover:text-primary transition-colors">
                        {materi.judul}
                      </Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs mt-1">
                      {materi.deskripsi}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="mt-auto pt-0">
                    <Button variant="outline" size="sm" asChild className="w-full text-xs">
                      <Link to={`/materi/${materi.slug}`}>
                        Buka Materi
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Kuis Latihan & Tugas Mandiri: Hanya tampil di Desktop (di Mobile digantikan Mading & Peringkat Skor Kuis) */}
      <div className="hidden md:block space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Kuis Latihan Tersedia</h2>
            <p className="text-xs text-muted-foreground">Kerjakan latihan untuk mendapatkan skor dan pembahasan langsung.</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link to="/murid/riwayat">Lihat Riwayat Lengkap &rarr;</Link>
          </Button>
        </div>

        {filteredKuis.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-card">
            <FileQuestion className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-foreground text-sm">Belum ada kuis latihan yang diterbitkan</p>
            <p className="text-xs text-muted-foreground mt-1">
              Guru belum mengubah status kuis menjadi "Terbit".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredKuis.map((k) => {
              const best = bestScoreMap.get(k.id)
              const passingScore = k.nilaiLulus || 70
              const isLulus = best && best.skor >= passingScore
              const refMateri = k.materiId ? materiList.find((m) => m.id === k.materiId) : null
              const isMateriRead = !k.materiId || !!progresMap[k.materiId]

              return (
                <Card key={k.id} className="flex flex-col hover:border-primary/50 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {k.jumlahSoal || k.soal?.length || 0} Soal
                      </span>
                      {!isMateriRead ? (
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          Wajib Baca Materi
                        </Badge>
                      ) : best ? (
                        isLulus ? (
                          <Badge variant="success" className="text-[10px]">
                            Lulus ({best.skor})
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            Belum Lulus ({best.skor})
                          </Badge>
                        )
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Belum Dikerjakan
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base font-bold line-clamp-2">
                      {k.judul}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {k.deskripsi || "Uji penguasaan materi recount text."}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="mt-auto pt-0 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                      <span>Nilai Lulus: <b>{passingScore}</b></span>
                      {best && <span>Terbaik: <b className="text-foreground">{best.skor}</b></span>}
                    </div>

                    {!isMateriRead ? (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="w-full text-xs border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-amber-900 font-bold"
                      >
                        <Link to={refMateri ? `/materi/${refMateri.slug || refMateri.id}` : "/murid"}>
                          <BookOpen className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                          Baca Materi Dulu
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" asChild className="w-full text-xs">
                        <Link to={`/murid/kuis/${k.id}`}>
                          <FileQuestion className="w-3.5 h-3.5 mr-1.5" />
                          {best ? "Ulangi Kuis" : "Mulai Kerjakan"}
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Grid: Penugasan Mandiri Siswa (Hanya tampil di Desktop) */}
      <div className="hidden md:block space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <span>Tugas</span>
            </h2>

          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs text-blue-600 font-bold hover:text-blue-700">
            <Link to="/murid/tugas">
              <span>Buka Semua Tugas</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        {filteredTugas.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-2xl bg-slate-50/50">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700 text-xs">Belum ada penugasan aktif untuk kelasmu</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tugas baru dari Ibu Guru akan tampil di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTugas.slice(0, 3).map((tugas) => {
              const sub = mySubmissionMap.get(tugas.id)
              const isSubmitted = !!sub
              const isGraded = sub?.status === "dinilai" && sub?.nilai !== undefined
              const isDeadlinePassed = tugas.deadline ? new Date(tugas.deadline) < new Date() : false

              return (
                <Card key={tugas.id} className="flex flex-col rounded-2xl border hover:border-blue-300 transition-all shadow-2xs">
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {isGraded ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                          Nilai: {sub.nilai}/100
                        </Badge>
                      ) : isSubmitted ? (
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                          Sudah Dikumpulkan
                        </Badge>
                      ) : isDeadlinePassed ? (
                        <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                          Lewat Tenggat
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          Belum Dikerjakan
                        </Badge>
                      )}

                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{tugas.deadline ? formatDate(tugas.deadline) : "Fleksibel"}</span>
                      </span>
                    </div>

                    <CardTitle className="text-sm font-extrabold line-clamp-2">
                      <Link to={`/murid/tugas/${tugas.id}`} className="hover:text-blue-600 transition-colors">
                        {tugas.judul}
                      </Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs">
                      {tugas.deskripsi}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="mt-auto p-4 pt-2">
                    <Button size="sm" asChild className="w-full text-xs rounded-xl font-bold h-8">
                      <Link to={`/murid/tugas/${tugas.id}`}>
                        <span>
                          {isGraded
                            ? "Lihat Nilai"
                            : isDeadlinePassed
                            ? "Lihat Detail"
                            : isSubmitted
                            ? "Perbarui Tautan"
                            : "Kumpulkan Tugas"}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Grid: Kuis Latihan */}

    </div>
  )
}

export default Dashboard

