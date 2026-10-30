import React, { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { getPercobaanByMurid } from "@/services/percobaan"
import { getKuisList } from "@/services/kuis"
import { getTugasList, getPengumpulanByMurid } from "@/services/tugas"
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
  ClipboardList,
  ExternalLink,
  MessageSquare,
  FileCheck2,
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
  const [activeTab, setActiveTab] = useState("semua") // "semua" | "kuis" | "tugas"
  
  // Data Kuis
  const [percobaanList, setPercobaanList] = useState([])
  const [kuisMap, setKuisMap] = useState(new Map())
  
  // Data Tugas
  const [tugasList, setTugasList] = useState([])
  const [submissionMap, setSubmissionMap] = useState({})
  
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("SEMUA") // "SEMUA" | "LULUS" | "REMIDIAL" / "DINILAI" | "MENUNGGU"
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
        const [percobaan, allKuis, allTugas, mySubs] = await Promise.all([
          getPercobaanByMurid(currentUser.uid),
          getKuisList(false),
          getTugasList(false),
          getPengumpulanByMurid(currentUser.uid),
        ])

        const kMap = new Map()
        allKuis.forEach((k) => kMap.set(k.id, k))
        setKuisMap(kMap)
        setPercobaanList(percobaan)

        // Mapping tugas & pengumpulan murid
        setTugasList(allTugas)
        const sMap = {}
        mySubs.forEach((s) => {
          sMap[s.tugasId] = s
        })
        setSubmissionMap(sMap)
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
    // 1. Kuis
    const totalKuis = percobaanList.length
    const lulusKuis = percobaanList.filter((p) => p.lulus).length
    const persenLulusKuis = totalKuis > 0 ? Math.round((lulusKuis / totalKuis) * 100) : 0
    const skorTertinggiKuis = totalKuis > 0 ? Math.max(...percobaanList.map((p) => p.skor || 0)) : 0
    const totalSkorKuis = percobaanList.reduce((acc, p) => acc + (p.skor || 0), 0)
    const rataRataKuis = totalKuis > 0 ? Math.round(totalSkorKuis / totalKuis) : 0

    // 2. Tugas
    const submittedTugas = Object.values(submissionMap)
    const totalTugasKumpul = submittedTugas.length
    const tugasDinilai = submittedTugas.filter((s) => s.status === "dinilai" && s.nilai !== undefined)
    const totalNilaiTugas = tugasDinilai.reduce((acc, s) => acc + Number(s.nilai || 0), 0)
    const rataRataTugas = tugasDinilai.length > 0 ? Math.round(totalNilaiTugas / tugasDinilai.length) : 0
    const nilaiTertinggiTugas = tugasDinilai.length > 0 ? Math.max(...tugasDinilai.map((s) => Number(s.nilai || 0))) : 0

    return {
      totalKuis,
      lulusKuis,
      persenLulusKuis,
      skorTertinggiKuis,
      rataRataKuis,
      totalTugasKumpul,
      totalTugasDinilai: tugasDinilai.length,
      rataRataTugas,
      nilaiTertinggiTugas,
      totalAktivitas: totalKuis + totalTugasKumpul,
    }
  }, [percobaanList, submissionMap])

  // Filter Kuis
  const filteredKuis = useMemo(() => {
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

  // Filter Tugas (yang sudah pernah dikumpulkan oleh murid ini)
  const filteredTugas = useMemo(() => {
    // Cari tugas-tugas yang memiliki pengumpulan dari siswa
    const tasksWithSubmission = tugasList
      .filter((t) => !!submissionMap[t.id])
      .map((t) => ({
        ...t,
        sub: submissionMap[t.id],
      }))

    return tasksWithSubmission.filter((t) => {
      const matchesSearch = (t.judul || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
      if (!matchesSearch) return false

      if (filterStatus === "DINILAI") return t.sub?.status === "dinilai" && t.sub?.nilai !== undefined
      if (filterStatus === "MENUNGGU") return t.sub?.status !== "dinilai"
      return true
    })
  }, [tugasList, submissionMap, filterStatus, searchQuery])

  if (loading) {
    return <RiwayatSkeleton />
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* ── 1. TOMBOL NAVIGASI KEMBALI ── */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 -ml-2"
        >
          <Link to="/murid">
            <ArrowLeft className="w-4 h-4 text-blue-600" />
            <span className="text-xs sm:text-sm font-bold">Kembali</span>
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
              <span>Pusat Rekapitulasi Pembelajaran Siswa</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
              Riwayat Kuis & Tugas
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-lg leading-relaxed">
              Pantau seluruh riwayat pengerjaan kuis formatif, evaluasi skor, serta status nilai tugas mandiri yang telah kamu kirimkan ke Ibu Guru.
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

      {/* ── 3. STATISTIK RINGKASAN GANDA (KUIS & TUGAS) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Aktivitas Selesai */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Selesai
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {stats.totalAktivitas}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            {stats.totalKuis} Kuis &bull; {stats.totalTugasKumpul} Tugas
          </div>
        </div>

        {/* Tingkat Kelulusan Kuis */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Kelulusan Kuis
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
            {stats.persenLulusKuis}%
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            {stats.lulusKuis} dari {stats.totalKuis} tuntas KKM
          </div>
        </div>

        {/* Tugas Dinilai Guru */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tugas Dinilai
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
            {stats.totalTugasDinilai}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Dari {stats.totalTugasKumpul} tugas yang dikirim
          </div>
        </div>

        {/* Skor Tertinggi Gabungan */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Skor Terbaik
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight">
            {Math.max(stats.skorTertinggiKuis, stats.nilaiTertinggiTugas)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Kuis: {stats.skorTertinggiKuis} | Tugas: {stats.nilaiTertinggiTugas}
          </div>
        </div>
      </div>

      {/* ── 4. MODERN PILL TAB SWITCHER (SEMUA / RIWAYAT KUIS / RIWAYAT TUGAS) ── */}
      <div className="space-y-3 pt-2">
        {/* Tab Switcher Utama Responsive: 3 Grid kolom di HP, Flex di Laptop */}
        <div className="bg-slate-100 p-1 rounded-2xl grid grid-cols-3 gap-1 w-full max-w-xl mx-auto sm:mx-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("semua")
              setFilterStatus("SEMUA")
            }}
            className={cn(
              "py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0",
              activeTab === "semua"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Semua</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold shrink-0",
                activeTab === "semua"
                  ? "bg-blue-50 text-blue-600"
                  : "bg-slate-200/80 text-slate-500"
              )}
            >
              {stats.totalAktivitas}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("kuis")
              setFilterStatus("SEMUA")
            }}
            className={cn(
              "py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0",
              activeTab === "kuis"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Kuis</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold shrink-0",
                activeTab === "kuis"
                  ? "bg-blue-50 text-blue-600"
                  : "bg-slate-200/80 text-slate-500"
              )}
            >
              {stats.totalKuis}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("tugas")
              setFilterStatus("SEMUA")
            }}
            className={cn(
              "py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0",
              activeTab === "tugas"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Tugas</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold shrink-0",
                activeTab === "tugas"
                  ? "bg-blue-50 text-blue-600"
                  : "bg-slate-200/80 text-slate-500"
              )}
            >
              {stats.totalTugasKumpul}
            </span>
          </button>
        </div>

        {/* Kolom Pencarian Responsif Full-Width di Mobile */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Cari judul kuis atau penugasan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-9 pr-9 text-xs rounded-2xl bg-white border-slate-200 shadow-2xs w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 5. SUB-FILTER STATUS CHIPS SESUAI TAB ── */}
      {activeTab === "kuis" && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "SEMUA", label: `Semua Kuis (${stats.totalKuis})` },
            { id: "LULUS", label: `Lulus KKM (${stats.lulusKuis})` },
            { id: "REMIDIAL", label: `Perlu Diulang (${stats.totalKuis - stats.lulusKuis})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterStatus(f.id)}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-xl transition-all border shrink-0",
                filterStatus === f.id
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "tugas" && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "SEMUA", label: `Semua Tugas (${stats.totalTugasKumpul})` },
            { id: "DINILAI", label: `Sudah Dinilai (${stats.totalTugasDinilai})` },
            { id: "MENUNGGU", label: `Menunggu Nilai (${stats.totalTugasKumpul - stats.totalTugasDinilai})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterStatus(f.id)}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-xl transition-all border shrink-0",
                filterStatus === f.id
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* ── 6. KONTEN FEED RIWAYAT ── */}
      <div className="space-y-3.5">
        {/* KONTEN KUIS */}
        {(activeTab === "semua" || activeTab === "kuis") && filteredKuis.length > 0 && (
          <div className="space-y-3">
            {activeTab === "semua" && (
              <div className="flex items-center gap-2 pt-2 pb-1 text-slate-700">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider">
                  Riwayat Kuis Formatif ({filteredKuis.length})
                </h3>
              </div>
            )}

            {filteredKuis.map((p) => {
              const kuisInfo = kuisMap.get(p.kuisId)
              const isLulus = p.lulus
              const passingScore = kuisInfo?.nilaiLulus || 70
              const akurasiPersen = p.total > 0 ? Math.round((p.benar / p.total) * 100) : 0

              return (
                <Card
                  key={`kuis-${p.id}`}
                  className={cn(
                    "rounded-2xl border transition-all duration-200 bg-white hover:shadow-md overflow-hidden",
                    isLulus ? "border-slate-200 hover:border-emerald-200" : "border-slate-200 hover:border-rose-200"
                  )}
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Sisi Kiri: Skor Bulat + Info Kuis */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
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

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            Kuis
                          </span>
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

                    {/* Sisi Kanan: Tombol Aksi */}
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="flex-1 sm:flex-initial h-9 px-3.5 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 text-slate-700 gap-1.5 shadow-2xs"
                      >
                        <Link to={`/murid/hasil/${p.id}`}>
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tinjau Jawaban</span>
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
            })}
          </div>
        )}

        {/* KONTEN TUGAS */}
        {(activeTab === "semua" || activeTab === "tugas") && filteredTugas.length > 0 && (
          <div className="space-y-3">
            {activeTab === "semua" && (
              <div className="flex items-center gap-2 pt-4 pb-1 text-slate-700">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider">
                  Riwayat Pengumpulan Tugas ({filteredTugas.length})
                </h3>
              </div>
            )}

            {filteredTugas.map((t) => {
              const sub = t.sub
              const isGraded = sub.status === "dinilai" && sub.nilai !== undefined

              return (
                <Card
                  key={`tugas-${t.id}`}
                  className="rounded-2xl border border-slate-200 hover:border-blue-300 transition-all duration-200 bg-white hover:shadow-md overflow-hidden"
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Sisi Kiri: Nilai / Status Badge + Info Tugas */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 border-2 shadow-2xs",
                          isGraded
                            ? "bg-emerald-50/80 border-emerald-300/80 text-emerald-700"
                            : "bg-blue-50/80 border-blue-300/80 text-blue-700"
                        )}
                      >
                        {isGraded ? (
                          <>
                            <span className="text-xl sm:text-2xl font-black leading-none tracking-tight">
                              {sub.nilai}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 opacity-80">
                              NILAI
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-5 h-5 text-blue-600 mb-0.5" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">
                              PROSES
                            </span>
                          </>
                        )}
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Tugas Mandiri
                          </span>
                          <h3 className="font-black text-sm sm:text-base text-slate-900 leading-snug line-clamp-1">
                            {t.judul}
                          </h3>
                          {isGraded ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold px-2 py-0">
                              Sudah Dinilai Guru
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] font-bold px-2 py-0">
                              Menunggu Penilaian Guru
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Dikirim: {formatDate(sub.submittedAt)}</span>
                          </span>
                          {t.deadline && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>Tenggat: {formatDate(t.deadline)}</span>
                            </span>
                          )}
                        </div>

                        {/* Ulasan Guru Jika Ada */}
                        {isGraded && sub.catatanGuru && (
                          <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 flex items-start gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="line-clamp-2">
                              <span className="font-bold text-slate-900">Catatan Guru: </span>
                              <span className="italic">{sub.catatanGuru}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sisi Kanan: Tombol Aksi Tugas */}
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <Button
                        size="sm"
                        asChild
                        className="flex-1 sm:flex-initial h-9 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs"
                      >
                        <Link to={`/murid/tugas/${t.id}`}>
                          <span>{isGraded ? "Lihat Nilai & Detail" : "Perbarui Tautan"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* JIKA TIDAK ADA DATA SAMA SEKALI */}
        {((activeTab === "semua" && filteredKuis.length === 0 && filteredTugas.length === 0) ||
          (activeTab === "kuis" && filteredKuis.length === 0) ||
          (activeTab === "tugas" && filteredTugas.length === 0)) && (
          <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
              <History className="w-6 h-6 opacity-70" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-base">
                {searchQuery || filterStatus !== "SEMUA"
                  ? "Tidak Ada Riwayat yang Sesuai"
                  : activeTab === "tugas"
                  ? "Belum Ada Riwayat Tugas yang Dikumpulkan"
                  : activeTab === "kuis"
                  ? "Belum Ada Riwayat Kuis"
                  : "Belum Ada Aktivitas Selesai"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || filterStatus !== "SEMUA"
                  ? "Coba sesuaikan kata kunci pencarian atau ubah tab filter di atas."
                  : activeTab === "tugas"
                  ? "Kamu belum pernah mengumpulkan tugas mandiri. Buka daftar tugas untuk mulai mengerjakan proyek tugasmu."
                  : "Mulai belajar modul materi dan kerjakan kuis latihan atau tugas mandiri."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold">
                <Link to="/murid">
                  <BookOpen className="w-4 h-4 mr-1.5" />
                  Materi Belajar
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold border-slate-200">
                <Link to="/murid/tugas">
                  <ClipboardList className="w-4 h-4 mr-1.5" />
                  Daftar Tugas
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

