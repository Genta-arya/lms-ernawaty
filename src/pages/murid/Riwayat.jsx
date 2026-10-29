import React, { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { getPercobaanByMurid } from "@/services/percobaan"
import { getKuisList } from "@/services/kuis"
import { formatDate } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RiwayatSkeleton } from "@/components/ui/loading-skeletons"
import { cn } from "@/lib/utils"
import {
  History,
  ArrowLeft,
  Trophy,
  CheckCircle2,
  RotateCcw,
  Eye,
  Sparkles,
  Clock,
  Target,
  TrendingUp,
  Search,
  Award,
  BookOpen,
  ChevronRight,
  AlertCircle,
  Calendar,
  X,
} from "lucide-react"

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "-"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} dtk`
  return `${m}m ${s}s`
}

export function Riwayat() {
  const { currentUser, profileData } = useAuth()
  const [percobaanList, setPercobaanList] = useState([])
  const [kuisMap, setKuisMap] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("SEMUA") // "SEMUA" | "LULUS" | "REMIDIAL"
  const [searchQuery, setSearchQuery] = useState("")

  const userFoto = profileData?.fotoUrl || currentUser?.photoURL || null
  const userNama = profileData?.nama || currentUser?.displayName || "Pelajar"
  const userInitial = userNama.charAt(0).toUpperCase()
  const userKelas = profileData?.kelasNama || "Kelas VIII"

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })

    async function load() {
      if (!currentUser) return
      try {
        const [percobaan, allKuis] = await Promise.all([
          getPercobaanByMurid(currentUser.uid),
          getKuisList(false),
        ])

        const kMap = new Map()
        allKuis.forEach((k) => kMap.set(k.id, k))
        setKuisMap(kMap)
        setPercobaanList(percobaan)
      } catch (err) {
        console.error("Gagal memuat riwayat:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentUser])

  // Perhitungan Ringkasan Statistik Siswa
  const stats = useMemo(() => {
    const total = percobaanList.length
    if (total === 0) {
      return { total: 0, lulus: 0, persenLulus: 0, skorTertinggi: 0, rataRata: 0 }
    }
    const lulus = percobaanList.filter((p) => p.lulus).length
    const persenLulus = Math.round((lulus / total) * 100)
    const skorTertinggi = Math.max(...percobaanList.map((p) => p.skor || 0))
    const totalSkor = percobaanList.reduce((acc, p) => acc + (p.skor || 0), 0)
    const rataRata = Math.round(totalSkor / total)

    return { total, lulus, persenLulus, skorTertinggi, rataRata }
  }, [percobaanList])

  // Filter & Pencarian
  const filteredList = useMemo(() => {
    return percobaanList.filter((p) => {
      const kuis = kuisMap.get(p.kuisId)
      const judul = (kuis?.judul || "Kuis Latihan").toLowerCase()
      const matchesSearch = judul.includes(searchQuery.trim().toLowerCase())

      if (!matchesSearch) return false

      if (filterStatus === "LULUS") return p.lulus
      if (filterStatus === "REMIDIAL") return !p.lulus
      return true
    })
  }, [percobaanList, kuisMap, filterStatus, searchQuery])

  if (loading) {
    return <RiwayatSkeleton />
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* ── 1. TOMBOL NAVIGASI KEMBALI ── */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 -ml-2"
        >
          <Link to="/murid">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-semibold">Kembali ke Materi</span>
          </Link>
        </Button>
      </div>

      {/* ── 2. HERO BANNER MODERN DENGAN PROFIL MURID ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800 text-white rounded-3xl p-5 sm:p-7 shadow-xl shadow-blue-500/15 border border-white/10">
        <div className="absolute -right-16 -bottom-16 w-60 h-60 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-white/20 px-3 py-0.5 rounded-full text-white backdrop-blur">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Capaian Belajar Mandiri</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
              Riwayat Pengerjaan Kuis
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-lg leading-relaxed">
              Pantau seluruh latihan formatif yang telah kamu selesaikan, evaluasi bagian yang keliru, dan tingkatkan skor pemahamanmu.
            </p>
          </div>

          {/* Kartu Mini Profil Murid */}
          <div className="shrink-0 bg-white/15 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/50 bg-blue-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
              {userFoto ? (
                <img src={userFoto} alt={userNama} className="w-full h-full object-cover" />
              ) : (
                <span>{userInitial}</span>
              )}
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white leading-tight line-clamp-1 max-w-[140px]">
                {userNama}
              </div>
              <div className="text-[11px] text-blue-200 font-medium mt-0.5">
                {userKelas}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. STATISTIK RINGKASAN (4 KARTU METRIK) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Kuis */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Latihan
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {stats.total}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Percobaan kuis selesai</div>
        </div>

        {/* Tingkat Kelulusan */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Kelulusan
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
            {stats.persenLulus}%
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            {stats.lulus} dari {stats.total} kuis tuntas KKM
          </div>
        </div>

        {/* Skor Tertinggi */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Skor Terbaik
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
            {stats.skorTertinggi}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Nilai tertinggi yang dicapai</div>
        </div>

        {/* Rata-Rata Nilai */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Rata-Rata Nilai
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight">
            {stats.rataRata}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Performa evaluasi keseluruhan</div>
        </div>
      </div>

      {/* ── 4. FILTER TABS & SEARCH BAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Filter Status Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterStatus("SEMUA")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border shrink-0",
              filterStatus === "SEMUA"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
            )}
          >
            Semua ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("LULUS")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border shrink-0",
              filterStatus === "LULUS"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
            )}
          >
            Lulus KKM ({stats.lulus})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("REMIDIAL")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all border shrink-0",
              filterStatus === "REMIDIAL"
                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
            )}
          >
            Perlu Diulang ({stats.total - stats.lulus})
          </button>
        </div>

        {/* Kolom Pencarian Kuis */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Cari judul kuis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-8 text-xs rounded-xl bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 5. DAFTAR KARTU RIWAYAT (MODERN FEED STYLE) ── */}
      <div className="space-y-3.5">
        {filteredList.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
              <History className="w-6 h-6 opacity-70" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-base">
                {searchQuery || filterStatus !== "SEMUA"
                  ? "Tidak Ada Riwayat yang Sesuai"
                  : "Belum Ada Riwayat Kuis"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || filterStatus !== "SEMUA"
                  ? "Coba sesuaikan kata kunci pencarian atau ubah tab filter di atas."
                  : "Kamu belum pernah mengerjakan kuis latihan. Buka katalog materi untuk mulai belajar!"}
              </p>
            </div>
            {stats.total === 0 && (
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold mt-2">
                <Link to="/murid">
                  <BookOpen className="w-4 h-4 mr-1.5" />
                  Mulai Belajar & Kerjakan Kuis
                </Link>
              </Button>
            )}
          </div>
        ) : (
          filteredList.map((p) => {
            const kuisInfo = kuisMap.get(p.kuisId)
            const isLulus = p.lulus
            const passingScore = kuisInfo?.nilaiLulus || 70
            const akurasiPersen = p.total > 0 ? Math.round((p.benar / p.total) * 100) : 0

            return (
              <Card
                key={p.id}
                className={cn(
                  "rounded-2xl border transition-all duration-200 bg-white hover:shadow-md overflow-hidden",
                  isLulus ? "border-slate-200 hover:border-emerald-200" : "border-slate-200 hover:border-rose-200"
                )}
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Sisi Kiri: Skor Bulat + Info Kuis */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Badge Skor Besar & Berwarna */}
                    <div
                      className={cn(
                        "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 border-2 shadow-2xs",
                        isLulus
                          ? "bg-emerald-50/80 border-emerald-300/80 text-emerald-700"
                          : "bg-rose-50/80 border-rose-300/80 text-rose-700"
                      )}
                    >
                      <span className="text-xl sm:text-2xl font-black leading-none tracking-tight">
                        {p.skor}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 opacity-80">
                        {isLulus ? "LULUS" : "REMIDIAL"}
                      </span>
                    </div>

                    {/* Rincian Kuis */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm sm:text-base text-slate-900 leading-snug line-clamp-1">
                          {kuisInfo ? kuisInfo.judul : "Kuis Latihan Formatif"}
                        </h3>
                        {isLulus ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold px-2 py-0">
                            Tuntas (KKM {passingScore})
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 border-none text-[10px] font-bold px-2 py-0">
                            Di Bawah KKM ({passingScore})
                          </Badge>
                        )}
                      </div>

                      {/* Detail Statistik Mini: Tanggal, Waktu, Durasi, dan Akurasi */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(p.selesaiAt)}</span>
                        </span>
                        {p.durasiDetik && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatDuration(p.durasiDetik)}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Target className="w-3 h-3 text-blue-500" />
                          <span>
                            {p.benar} / {p.total} Benar ({akurasiPersen}%)
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sisi Kanan: Tombol Aksi (Tinjau & Coba Lagi) */}
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="flex-1 sm:flex-initial h-9 px-3.5 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 text-slate-700 gap-1.5 shadow-2xs"
                    >
                      <Link to={`/murid/hasil/${p.id}`}>
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tinjau Soal</span>
                      </Link>
                    </Button>

                    <Button
                      size="sm"
                      asChild
                      className="flex-1 sm:flex-initial h-9 px-3.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs"
                    >
                      <Link to={`/murid/kuis/${p.kuisId}`}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Ulangi Kuis</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
