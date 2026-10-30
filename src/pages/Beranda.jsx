import React, { useEffect, useState, useRef } from "react"
import { Link } from "react-router-dom"
import { getMateriList } from "@/services/materi"
import { getSekolahInfo, getGuruUtama } from "@/services/guru"
import { getTopKaryaList } from "@/services/karya"
import { getKelasList } from "@/services/kelas"
import { useAuth } from "@/context/AuthContext"
import { normalizeTingkatRomawi, isMateriCocokTingkat, formatNamaKelas } from "@/lib/utils"
import { MateriCardSkeleton } from "@/components/ui/loading-skeletons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  Lock,
  GraduationCap,
  Award,
  Compass,
  Layers,
  ChevronRight,
  ChevronLeft,
  School,
  CheckCircle,
  FileQuestion,
  Users,
  HelpCircle,
  ChevronDown,
  ArrowUp,
  Heart,
  MessageSquare,
  Feather,
  Quote,
} from "lucide-react"

// Component Count Up Animasi Murni (Bebas Dependency Eksternal, Halus 60 FPS)
function Counter({ target = 0, duration = 1500, suffix = "" }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = parseInt(target, 10) || 0
    if (end === 0) {
      setCount(0)
      return
    }

    const totalMiliseconds = duration
    const intervalTime = 16 // ~60fps
    const totalSteps = totalMiliseconds / intervalTime
    const increment = (end - start) / totalSteps

    let current = start
    const timer = setInterval(() => {
      current += increment
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, intervalTime)

    return () => clearInterval(timer)
  }, [target, duration])

  return (
    <span>
      {count}
      {suffix}
    </span>
  )
}

export function Beranda() {
  const { currentUser, role, profileData } = useAuth()
  const [materiList, setMateriList] = useState([])
  const [topKarya, setTopKarya] = useState([])
  const [kelasMap, setKelasMap] = useState({})
  const [activeSlide, setActiveSlide] = useState(0)
  const [sekolah, setSekolah] = useState({ nama: "SMPN 3 Ketapang" })
  const [guru, setGuru] = useState({ nama: "Ernawaty", mapel: "Bahasa Indonesia" })
  const [selectedTingkat, setSelectedTingkat] = useState("SEMUA")
  const [loading, setLoading] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  // Deteksi tingkat kelas siswa jika sudah login
  const studentTingkat =
    role === "murid"
      ? normalizeTingkatRomawi(profileData?.tingkat || profileData?.kelasNama)
      : null

  // Otomatis arahkan tab filter ke tingkat kelas murid saat login jika belum dipilih
  // Catatan: Biarkan default "SEMUA" agar pengunjung / siswa dapat melihat katalog lengkap
  // tanpa tersembunyi karena ketidakcocokan filter tingkat awal

  useEffect(() => {
    // Scroll otomatis ke paling atas saat pertama dibuka
    window.scrollTo({ top: 0, behavior: "smooth" })

    // Listener scroll untuk floating button
    function handleScroll() {
      if (window.scrollY > 300) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }
    window.addEventListener("scroll", handleScroll)

    async function loadData() {
      try {
        const [materiRes, sekRes, gRes, karyaRes, kelasRes] = await Promise.allSettled([
          getMateriList(false),
          getSekolahInfo(),
          getGuruUtama(),
          getTopKaryaList(5),
          getKelasList(),
        ])

        if (materiRes.status === "fulfilled" && materiRes.value) {
          setMateriList(materiRes.value)
        } else if (materiRes.status === "rejected") {
          console.error("Gagal load materi di Beranda:", materiRes.reason)
        }
        if (sekRes.status === "fulfilled" && sekRes.value) {
          setSekolah(sekRes.value)
        }
        if (gRes.status === "fulfilled" && gRes.value) {
          setGuru(gRes.value)
        }
        if (karyaRes.status === "fulfilled" && karyaRes.value) {
          setTopKarya(karyaRes.value)
        }
        if (kelasRes.status === "fulfilled" && kelasRes.value) {
          const kMap = {}
          kelasRes.value.forEach((k) => {
            kMap[k.id] = `Kelas ${k.nama}`
          })
          setKelasMap(kMap)
        }
      } catch (err) {
        console.error("Gagal memuat data Beranda:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [studentTingkat])

  // Auto rotate carousel setiap 5 detik jika ada lebih dari 1 karya
  useEffect(() => {
    if (topKarya.length <= 1) return
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % topKarya.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [topKarya.length])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Filter materi: Tampilkan materi sesuai tingkat yang dipilih
  const filteredMateri = materiList.filter((m) => {
    if (selectedTingkat === "SEMUA") {
      return true
    }
    // Cek apakah array tingkat pada materi mengandung tingkat yang dipilih
    if (!m.tingkat || !Array.isArray(m.tingkat) || m.tingkat.length === 0) {
      return true
    }
    return m.tingkat.some(
      (t) => normalizeTingkatRomawi(t) === normalizeTingkatRomawi(selectedTingkat)
    )
  })

  return (
    <div className="space-y-16 pb-20 overflow-hidden">
      {/* HERO SECTION DENGAN EFEK AMBIENT GLOW & ANIMASI MODERN */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-24 bg-gradient-to-b from-blue-50/80 via-indigo-50/40 to-background border-b border-slate-100">
        {/* Glow ambient background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-blue-400/15 via-indigo-400/15 to-purple-400/15 blur-3xl pointer-events-none -z-10 animate-pulse" />

        <div className="container max-w-7xl relative z-10 px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-14">
            {/* Teks Hero (7 Cols) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/90 border border-blue-200 text-blue-800 text-xs font-semibold shadow-xs hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" style={{ animationDuration: "6s" }} />
                <span>Media Belajar Mandiri Kurikulum Merdeka &bull; Fase D</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black tracking-tight text-slate-900 leading-[1.15]">
                Tingkatkan Literasi Belajar Bersama{" "}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {sekolah.nama || "SMPN 3 Ketapang"}
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                Eksplorasi materi pembelajaran mandiri mata pelajaran{" "}
                <b className="text-slate-800 font-semibold">Bahasa Indonesia</b>{" "}
                bersama <b className="text-slate-800 font-semibold">Ibu {guru.nama || "Ernawaty"}</b>. Baca modul pembelajaran terstruktur dan uji pemahamanmu melalui kuis interaktif.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-2">
                {!currentUser ? (
                  <>
                    <Button
                      size="lg"
                      asChild
                      className="h-12 px-6 rounded-xl shadow-lg shadow-blue-500/25 font-bold text-sm bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Link to="/masuk">
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Masuk Portal Siswa
                        <ArrowRight className="w-4 h-4 ml-2 opacity-80" />
                      </Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      asChild
                      className="h-12 px-6 rounded-xl border-slate-200 hover:bg-slate-50 font-semibold text-sm hover:scale-105 transition-all"
                    >
                      <a href="#materi-section">Lihat Modul Materi</a>
                    </Button>
                  </>
                ) : role === "murid" ? (
                  <Button
                    size="lg"
                    asChild
                    className="h-12 px-6 rounded-xl shadow-lg shadow-blue-500/25 font-bold text-sm bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all"
                  >
                    <Link to="/murid">
                      Buka Dashboard Belajar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                ) : role === "guru" ? (
                  <Button
                    size="lg"
                    asChild
                    className="h-12 px-6 rounded-xl shadow-lg shadow-indigo-500/25 font-bold text-sm bg-indigo-600 hover:bg-indigo-700 hover:scale-105 transition-all"
                  >
                    <Link to="/guru">
                      Buka Dashboard Guru
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    asChild
                    className="h-12 px-6 rounded-xl shadow-lg font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white hover:scale-105 transition-all"
                  >
                    <Link to="/aktivasi">
                      Lengkapi Form Aktivasi Akun
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                )}
              </div>

              {/* Micro-Features */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 pt-4 text-xs text-slate-500 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Akses Mandiri (24/7)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Kuis Formatif Otomatis</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Pantau Skor Real-Time</span>
                </div>
              </div>
            </div>

            {/* Hero Card Visual / Preview Lebar (5 Cols) */}
            <div className="lg:col-span-5 w-full">
              <div className="relative p-6 sm:p-8 rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl space-y-6 hover:shadow-blue-500/10 transition-shadow duration-300">
                {/* Header Profil Sekolah & Guru */}
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <img
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkMwdy4_7y48uzPnbFyQIzELTIrQTUGMHfofMTkNenIM_ExEml_YBWl275&s=10"
                      alt="Logo SMPN 3 Ketapang"
                      className="w-14 h-14 object-contain rounded-2xl bg-white p-1.5 shadow-md border border-slate-200 shrink-0"
                    />
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base tracking-tight">
                        {sekolah.nama || "SMPN 3 Ketapang"}
                      </h4>
                      <p className="text-xs text-blue-600 font-semibold">
                        Bahasa Indonesia &bull; Ibu {guru.nama || "Ernawaty"}
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Aktif
                  </span>
                </div>

                {/* Progress / Modul Card Lebar */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      Status Modul Pembelajaran
                    </span>
                 
                  </div>
                  <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 h-2.5 rounded-full w-full animate-pulse" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Materi telah disesuaikan dengan Capaian Pembelajaran Fase D (Kelas VII, VIII, IX) Kurikulum Merdeka.
                  </p>
                </div>

                {/* Grid Statistik 3 Kolom dengan ANIMASI COUNT UP */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100/90 hover:bg-blue-50 hover:scale-105 transition-all">
                    <div className="text-2xl font-black text-blue-700 tracking-tight">
                      <Counter target={materiList.length} duration={1200} />
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-1">
                      Materi
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100/90 hover:bg-indigo-50 hover:scale-105 transition-all">
                    <div className="text-2xl font-black text-indigo-700 tracking-tight">
                      <Counter target={100} duration={1400} suffix="%" />
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-1">
                      Formatif
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100/90 hover:bg-purple-50 hover:scale-105 transition-all">
                    <div className="text-2xl font-black text-purple-700 tracking-tight">
                      Fase D
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-1">
                      Jenjang
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STRIP STATISTIK ANGKA (COUNTER HIGHLIGHTS MODERN) */}
      <section className="container max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-xl">
          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-blue-400">
              <Counter target={materiList.length} duration={1500} />
            </div>
            <div className="text-xs text-slate-400 font-medium">Modul Pembelajaran</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-emerald-400">
              <Counter target={3} duration={1000} />
            </div>
            <div className="text-xs text-slate-400 font-medium">Tingkat Kelas (VII, VIII, IX)</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-amber-400">
              <Counter target={100} duration={1500} suffix="%" />
            </div>
            <div className="text-xs text-slate-400 font-medium">Penilaian Otomatis</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-purple-400">
              24<span className="text-lg">/7</span>
            </div>
            <div className="text-xs text-slate-400 font-medium">Akses Kapan Saja</div>
          </div>
        </div>
      </section>

      {/* CAROUSEL KARYA TERBAIK SISWA (TOP 5 PALING BANYAK LIKE & KOMEN) */}
      {topKarya.length > 0 && (
        <section className="container max-w-6xl px-4 sm:px-6">
          <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
            {/* Ambient background decoration */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Carousel */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 relative z-10">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-200 border border-white/10 text-xs font-bold backdrop-blur">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Karya Terpopuler Literasi Pelajar</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Pojok Kreasi Terbaik Minggu Ini
                </h2>
                <p className="text-xs sm:text-sm text-blue-200/80">
                  5 karya siswa dengan apresiasi suka dan komentar terbanyak.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold rounded-xl h-9"
                >
                  <Link to={role === "guru" ? "/guru/mading" : role === "murid" ? "/murid/mading" : "/mading"}>
                    <Feather className="w-3.5 h-3.5 mr-1.5" />
                    Buka Semua Kreasi
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Carousel Slide Card Utama */}
            <div className="relative z-10">
              {(() => {
                const item = topKarya[activeSlide] || topKarya[0]
                const totalLikes = item.likeCount || item.likes?.length || 0
                const totalComments = item.komentar?.length || 0

                return (
                  <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 transition-all duration-300">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      {/* Author Info & Avatar */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/30 bg-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {item.penulisFoto ? (
                            <img
                              src={item.penulisFoto}
                              alt={item.penulisNama}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{item.penulisNama?.charAt(0).toUpperCase() || "S"}</span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm sm:text-base text-white">
                              {item.penulisNama}
                            </span>
                            <span className="text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-md">
                              {formatNamaKelas(item.penulisKelas, kelasMap)}
                            </span>
                          </div>
                          <div className="text-[11px] text-blue-200/70 font-medium">
                            Peringkat #{activeSlide + 1} Terpopuler
                          </div>
                        </div>
                      </div>

                      {/* Kategori Badge */}
                      <Badge className="bg-white/15 text-white border-white/20 text-xs font-bold px-3 py-1">
                        {item.kategori || "Pantun Melayu"}
                      </Badge>
                    </div>

                    {/* Judul Karya */}
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      {item.judul}
                    </h3>

                    {/* Bait Isi Pantun / Puisi */}
                    <div className="relative p-4 sm:p-5 rounded-2xl bg-black/20 border border-white/10 text-blue-50 font-serif italic text-sm sm:text-base leading-relaxed whitespace-pre-line">
                      <Quote className="absolute right-3 top-3 w-8 h-8 text-white/10 -scale-x-100 pointer-events-none" />
                      <div className="relative z-10 select-text">
                        "{item.isi}"
                      </div>
                    </div>

                    {/* Footer Stats & Navigasi */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 flex-wrap gap-3">
                      {/* Interaction Counts */}
                      <div className="flex items-center gap-4 text-xs font-bold text-blue-200">
                        <span className="flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-400/30 px-3 py-1 rounded-xl">
                          <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                          <span>{totalLikes} Suka</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-xl">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{totalComments} Komentar</span>
                        </span>
                      </div>

                      {/* Tombol Navigasi Next & Prev */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveSlide((prev) =>
                              prev === 0 ? topKarya.length - 1 : prev - 1
                            )
                          }
                          aria-label="Karya Sebelumnya"
                          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1.5 px-2">
                          {topKarya.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveSlide(idx)}
                              aria-label={`Slide ${idx + 1}`}
                              className={`h-2 rounded-full transition-all ${
                                activeSlide === idx
                                  ? "w-6 bg-blue-400"
                                  : "w-2 bg-white/30 hover:bg-white/50"
                              }`}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveSlide((prev) => (prev + 1) % topKarya.length)
                          }
                          aria-label="Karya Selanjutnya"
                          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </section>
      )}

      {/* KEUNGGULAN BELAJAR LMS (3 PILAR MODERN) */}
      <section className="container max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Metode Belajar Interaktif & Fleksibel
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Didesain khusus untuk meningkatkan pemahaman siswa secara bertahap dan terukur.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Materi Terstruktur</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Materi disusun bertahap mulai dari pengenalan struktur, ciri kebahasaan, hingga contoh teks nyata yang mudah dipahami siswa.
            </p>
          </div>

          <div className="group p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Kuis Mandiri & Pembahasan</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Setiap kuis memberikan evaluasi instan lengkap dengan kunci jawaban dan pembahasan agar siswa langsung belajar dari kesalahan.
            </p>
          </div>

          <div className="group p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-purple-300 hover:-translate-y-1 transition-all duration-300 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Pemantauan Progres Guru</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ibu Ernawaty memantau rekap hasil belajar siswa tiap kelas secara transparan melalui dashboard pengajar.
            </p>
          </div>
        </div>
      </section>

      {/* DAFTAR MATERI TERBIT (KATALOG PEMBELAJARAN) */}
      <section id="materi-section" className="container max-w-6xl px-4 sm:px-6 scroll-mt-20">
        {!currentUser && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Pratinjau Materi Pembelajaran</span>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Akses Publik Terbatas
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Jelajahi judul dan topik materi kurikulum. Silakan masuk dengan akun siswa SMPN 3 Ketapang untuk membaca modul lengkap dan mengerjakan kuis interaktif.
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl shrink-0 shadow-xs"
            >
              <Link to="/masuk">
                Masuk / Aktivasi Akun
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
              Katalog Pembelajaran
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Materi Tersedia
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Pilih materi di bawah untuk mulai belajar secara mandiri.
            </p>
            {studentTingkat && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-bold mt-2">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  Siswa {profileData?.kelasNama || `Kelas ${studentTingkat}`} &bull;
                </span>
              </div>
            )}
          </div>

          {/* Filter Tingkat Modern */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {["SEMUA", "VII", "VIII", "IX"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTingkat(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  selectedTingkat === t
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{t === "SEMUA" ? "Semua Kelas" : `Kelas ${t}`}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 skeleton-stagger">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <MateriCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredMateri.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-3xl bg-slate-50/50">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
            <p className="font-bold text-slate-800 text-base">Belum ada materi untuk kategori ini</p>
          
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMateri.map((materi) => (
              <div
                key={materi.id}
                className="group flex flex-col justify-between bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-blue-400/80 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Header Card */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                      {materi.topik || guru.mapel || "Bahasa Indonesia"}
                    </span>
                    <div className="flex gap-1 items-center">
                      {!currentUser && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" />
                          Spoiler
                        </span>
                      )}
                      {materi.tingkat?.map((ting) => (
                        <span key={ting} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          Kelas {ting}
                        </span>
                      ))}
                    </div>
                  </div>

                  <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    {materi.judul}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {materi.deskripsi || "Pelajari materi ini secara mandiri dengan teks dan contoh yang tersedia."}
                  </p>
                </div>

                {/* Footer Card */}
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 mt-auto space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {materi.bagian?.length || 0} Bagian Pembelajaran
                    </span>
                    <span>Kurikulum Merdeka</span>
                  </div>

                  {currentUser ? (
                    isMateriCocokTingkat(materi.tingkat, studentTingkat) ? (
                      <Button
                        asChild
                        className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs group-hover:shadow-md transition-all"
                      >
                        <Link to={`/materi/${materi.slug}`}>
                          <span>Buka Materi</span>
                          <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        disabled
                        className="w-full h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs cursor-not-allowed gap-1.5 shadow-none"
                        title={`Materi ini khusus untuk Kelas ${materi.tingkat?.join(", ")}. Anda terdaftar di Kelas ${studentTingkat}.`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Terkunci (Khusus Kelas {materi.tingkat?.join(", ")})</span>
                      </Button>
                    )
                  ) : (
                    <Button
                      asChild
                      className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-2 shadow-xs hover:bg-blue-600 transition-colors"
                    >
                      <Link to="/masuk" state={{ from: `/materi/${materi.slug}` }}>
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Masuk untuk Membaca</span>
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION FAQ (PERTANYAAN SERING DIAJUKAN) */}
      <section className="container max-w-4xl px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/80 text-blue-800 text-xs font-bold">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Pusat Bantuan & FAQ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Temukan jawaban cepat seputar pembelajaran mandiri di LMS SMPN 3 Ketapang.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Bagaimana cara murid login dan mulai belajar?",
              a: "Murid cukup menekan tombol 'Masuk Portal' di sudut kanan atas dan pilih 'Lanjutkan dengan Google'. Jika akun baru pertama kali digunakan, kamu akan diminta melengkapi NISN dan memilih kelasmu untuk verifikasi pengajar.",
            },
            {
              q: "Apakah materi dapat dibaca kapan saja?",
              a: "Ya! LMS ini dirancang untuk pembelajaran mandiri fleksibel (24 jam sehari, 7 hari seminggu). Murid dapat membaca materi dan mempelajari struktur teks kapan pun dari HP maupun laptop.",
            },
            {
              q: "Bagaimana sistem kuis latihan formatif bekerja?",
              a: "Setelah membaca modul materi, murid dapat langsung mencoba kuis formatif. Skor akan dihitung otomatis saat selesai, dilengkapi pembahasan jawaban agar murid dapat memahami letak kekeliruan secara langsung.",
            },
            {
              q: "Apakah murid dapat mengulang pengerjaan kuis?",
              a: "Ya, kuis formatif ditujukan untuk mengasah pemahaman mandiri, sehingga murid dapat berlatih kembali sesuai batas percobaan yang ditentukan oleh Ibu guru pengampu.",
            },
            {
              q: "Apakah saya perlu menginstal aplikasi tambahan di HP?",
              a: "Tidak perlu. LMS SMPN 3 Ketapang sudah didesain responsif penuh dengan navigasi modern ala aplikasi mobile melalui browser (Google Chrome atau Safari).",
            },
          ].map((faq, idx) => {
            const isOpen = openFaq === idx
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-800 text-sm hover:text-blue-600 transition-colors"
                >
                  <span className="leading-snug">{faq.q}</span>
                  <div
                    className={`p-1 rounded-full bg-slate-100 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 bg-blue-50 text-blue-600" : "text-slate-400"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50 animate-in fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* FLOATING BUTTON SCROLL TO TOP */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Kembali ke atas"
          className="fixed bottom-20 md:bottom-8 right-5 z-40 p-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-xl shadow-blue-500/30 transition-all duration-300 flex items-center justify-center animate-in fade-in zoom-in hover:scale-110"
        >
          <ArrowUp className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}
    </div>
  )
}
