import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { getMateriList } from "@/services/materi"
import { getKuisList } from "@/services/kuis"
import { getProgresMurid } from "@/services/progres"
import { getKelasById } from "@/services/kelas"
import { normalizeTingkatRomawi, isMateriCocokTingkat } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardMuridSkeleton } from "@/components/ui/loading-skeletons"
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Sparkles,
  X,
  FileQuestion,
  Lock,
  GraduationCap,
  AlertTriangle,
} from "lucide-react"

export function MateriBelajar() {
  const { currentUser, profileData } = useAuth()
  const [kelasData, setKelasData] = useState(null)
  const [materiList, setMateriList] = useState([])
  const [kuisList, setKuisList] = useState([])
  const [progresMap, setProgresMap] = useState({})
  const [loading, setLoading] = useState(true)

  // Filter Search & Status Selesai
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("semua") // "semua" | "selesai" | "belum"

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })

    async function loadData() {
      if (!currentUser) return
      setLoading(true)

      try {
        const fetchKelas = profileData?.kelasId ? getKelasById(profileData.kelasId) : Promise.resolve(null)
        const [allMateri, allKuis, progres, kData] = await Promise.all([
          getMateriList(false),
          getKuisList(false),
          getProgresMurid(currentUser.uid),
          fetchKelas,
        ])

        setMateriList(allMateri)
        setKuisList(allKuis)
        setKelasData(kData)

        const pMap = {}
        progres.forEach((p) => {
          pMap[p.materiId] = p.selesai
        })
        setProgresMap(pMap)
      } catch (err) {
        console.error("Gagal memuat materi murid:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentUser, profileData])

  // Normalisasi tingkat kelas siswa: VII, VIII, atau IX
  const rawTingkat = kelasData?.tingkat || profileData?.tingkat || profileData?.kelasNama
  const studentTingkat = normalizeTingkatRomawi(rawTingkat)

  if (loading) {
    return <DashboardMuridSkeleton />
  }

  // 1. FILTER VALIDASI KELAS KETAT:
  // Hanya tampilkan materi yang cocok dengan tingkat kelas siswa (atau materi untuk semua tingkat)
  const kelasValidMateri = materiList.filter((m) => {
    if (!studentTingkat) return true
    return isMateriCocokTingkat(m.tingkat, studentTingkat)
  })

  // 2. Filter sekunder berdasarkan search query & status baca
  const filteredMateri = kelasValidMateri.filter((m) => {
    const q = searchQuery.toLowerCase().trim()
    const matchSearch =
      !q ||
      m.judul?.toLowerCase().includes(q) ||
      m.deskripsi?.toLowerCase().includes(q) ||
      m.topik?.toLowerCase().includes(q)

    const isRead = !!progresMap[m.id]
    if (statusFilter === "selesai") return matchSearch && isRead
    if (statusFilter === "belum") return matchSearch && !isRead
    return matchSearch
  })

  // Statistik Progres Membaca Khusus Materi Kelasnya
  const totalMateriKelas = kelasValidMateri.length
  const totalSelesai = kelasValidMateri.filter((m) => !!progresMap[m.id]).length
  const persenSelesai = totalMateriKelas > 0 ? Math.round((totalSelesai / totalMateriKelas) * 100) : 0

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. Header Banner Pembelajaran Tervalidasi */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-5 sm:p-7 shadow-lg shadow-blue-500/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold w-fit">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Katalog Materi Belajar</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-white/20 text-xs font-bold px-2.5 py-0.5">
              {studentTingkat ? `Kelas ${studentTingkat}` : (profileData?.kelasNama || "Fase D")}
            </Badge>
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Materi Pembelajaran Bahasa Indonesia
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-2xl leading-relaxed">
            Materi di bawah telah divalidasi dan disesuaikan khusus untuk kurikulum tingkat{" "}
            <b>Kelas {studentTingkat || "Fase D"}</b> Anda. Selesaikan membaca materi untuk mengaktifkan latihan kuis.
          </p>
        </div>

        {/* Progres Belajar Bar */}
        <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 backdrop-blur">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Progres Literasi Materi Anda
            </span>
            <span className="font-black text-amber-300">{persenSelesai}% Selesai</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${persenSelesai}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-blue-100 mt-2">
            <span>{totalSelesai} dari {totalMateriKelas} materi kelas selesai dipelajari</span>
            <span>{Math.max(0, totalMateriKelas - totalSelesai)} materi tersisa</span>
          </div>
        </div>
      </div>

      {/* 2. Bilah Filter & Pencarian Materi */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Input Cari */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul materi, kaidah kebahasaan..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Status (Semua, Selesai, Belum) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0">
          {[
            { id: "semua", label: "Semua" },
            { id: "selesai", label: "Sudah Selesai" },
            { id: "belum", label: "Belum Dibaca" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                statusFilter === st.id
                  ? "bg-white text-blue-600 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Daftar Kartu Materi Pembelajaran Sesuai Kelas Siswa */}
      {filteredMateri.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-3xl bg-slate-50/60 p-6">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-xs text-slate-400">
            <BookOpen className="w-7 h-7 stroke-[1.6]" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Tidak ada materi yang sesuai</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "semua"
              ? "Coba sesuaikan kata kunci pencarian atau ubah filter status baca Anda."
              : `Belum ada materi pembelajaran yang diterbitkan guru khusus untuk Kelas ${studentTingkat || "Anda"}.`}
          </p>
          {(searchQuery || statusFilter !== "semua") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setStatusFilter("semua")
              }}
              className="mt-4 text-xs rounded-xl"
            >
              Reset Filter
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredMateri.map((materi) => {
            const isRead = !!progresMap[materi.id]
            const relatedKuis = kuisList.find((k) => k.materiId === materi.id)

            return (
              <Card
                key={materi.id}
                className="flex flex-col hover:border-blue-400 hover:shadow-md transition-all rounded-3xl border-slate-200/90 overflow-hidden group bg-white"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-lg">
                        {materi.topik || "Recount"}
                      </Badge>
                      {materi.tingkat && Array.isArray(materi.tingkat) && (
                        <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-200 bg-blue-50/50 font-bold px-2 py-0.5 rounded-lg">
                          Kelas {materi.tingkat.join(", ")}
                        </Badge>
                      )}
                    </div>

                    {isRead ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold gap-1 px-2 py-0.5 rounded-lg shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Selesai
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 text-slate-500 border-slate-200 px-2 py-0.5 rounded-lg">
                        <Clock className="w-3 h-3" />
                        Belum Selesai
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-base font-bold line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                    <Link to={`/materi/${materi.slug}`}>
                      {materi.judul}
                    </Link>
                  </CardTitle>

                  <CardDescription className="line-clamp-2 text-xs mt-1.5 text-slate-500 leading-relaxed">
                    {materi.deskripsi || "Pelajari kaidah kebahasaan dan struktur teks secara mendalam."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="mt-auto p-5 pt-0 space-y-3">
                  {relatedKuis && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <FileQuestion className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">Kuis: {relatedKuis.judul}</span>
                    </div>
                  )}

                  <Button
                    size="sm"
                    asChild
                    className={`w-full text-xs rounded-xl font-bold gap-1.5 transition-all shadow-xs ${
                      isRead
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    <Link to={`/materi/${materi.slug}`}>
                      <span>{isRead ? "Baca Ulang Materi" : "Mulai Belajar"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
