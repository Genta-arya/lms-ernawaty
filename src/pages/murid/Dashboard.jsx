import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { getMateriList } from "@/services/materi"
import { getKuisList } from "@/services/kuis"
import { getProgresMurid } from "@/services/progres"
import { getPercobaanByMurid } from "@/services/percobaan"
import { getKelasById } from "@/services/kelas"
import { getGuruUtama } from "@/services/guru"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardMuridSkeleton } from "@/components/ui/loading-skeletons"
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
} from "lucide-react"

export function Dashboard() {
  const { currentUser, profileData } = useAuth()
  const [kelasData, setKelasData] = useState(null)
  const [guruData, setGuruData] = useState(null)
  const [materiList, setMateriList] = useState([])
  const [kuisList, setKuisList] = useState([])
  const [progresMap, setProgresMap] = useState({})
  const [percobaanList, setPercobaanList] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter Search & Status Selesai
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("semua") // "semua" | "selesai" | "belum"

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
        ])

        if (results[0].status === "fulfilled") setMateriList(results[0].value || [])
        if (results[1].status === "fulfilled") setKuisList(results[1].value || [])
        if (results[2].status === "fulfilled") setProgresMap(results[2].value || {})
        if (results[3].status === "fulfilled") setPercobaanList(results[3].value || [])
        if (results[4].status === "fulfilled" && results[4].value) setKelasData(results[4].value)
        if (results[5].status === "fulfilled" && results[5].value) setGuruData(results[5].value)
      } catch (err) {
        console.error("Gagal memuat portal murid:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [currentUser, profileData])

  // Mapping skor terbaik per kuisId
  const bestScoreMap = new Map()
  percobaanList.forEach((p) => {
    const existing = bestScoreMap.get(p.kuisId)
    if (!existing || p.skor > existing.skor) {
      bestScoreMap.set(p.kuisId, p)
    }
  })

  // Penentuan tingkat kelas siswa
  const tingkatRaw = kelasData?.tingkat
  const tingkatNum = Number(tingkatRaw)
  const tingkatRomawi =
    tingkatNum === 7 || tingkatRaw === "VII"
      ? "VII"
      : tingkatNum === 8 || tingkatRaw === "VIII"
      ? "VIII"
      : tingkatNum === 9 || tingkatRaw === "IX"
      ? "IX"
      : null

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

  if (loading) {
    return <DashboardMuridSkeleton />
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Profil Murid */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {/* Avatar Siswa */}
          <Link to="/murid/profil" title="Buka Profil Siswa" className="relative group shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur border-2 border-white/30 flex items-center justify-center font-black text-xl sm:text-2xl shadow-md overflow-hidden group-hover:scale-105 transition-transform">
              {profileData?.fotoUrl || currentUser?.photoURL ? (
                <img
                  src={profileData?.fotoUrl || currentUser?.photoURL}
                  alt={profileData?.nama || "Siswa"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{(profileData?.nama || "S").charAt(0).toUpperCase()}</span>
              )}
            </div>
          </Link>

          <div className="space-y-1.5">
            <Badge className="bg-white/20 text-white border-none text-xs">
              Portal Belajar Mandiri
            </Badge>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
                Halo, {profileData?.nama || "Siswa"}!
              </h1>
              <Link
                to="/murid/profil"
                title="Edit Profil & Nama Siswa"
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all hover:scale-105 active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-blue-100">
              <span>NISN: <b>{profileData?.nisn || "-"}</b></span>
              <span>&bull;</span>
              <span>Kelas: <b>{kelasData ? `Kelas ${kelasData.nama}` : "-"}</b></span>
              <span>&bull;</span>
              <span>Mata Pelajaran: <b>{guruData?.mapel ? guruData.mapel : "Bahasa Indonesia"}</b></span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-3 shrink-0">
          <Trophy className="w-8 h-8 text-amber-300" />
          <div>
            <div className="text-xs text-blue-100 font-medium">Kuis Selesai</div>
            <div className="text-xl font-bold">{bestScoreMap.size} Kuis</div>
          </div>
        </div>
      </div>

      {/* Label Penting Kuis Latihan */}
      <div className="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <b>Catatan Belajar:</b> Kuis dalam portal ini bersifat <b>kuis latihan formatif</b>. Kamu dapat membaca materi terlebih dahulu lalu berlatih kuis untuk menguji pemahaman dan melihat pembahasannya.
        </div>
      </div>

      {/* Grid: Materi Pembelajaran */}
      <div className="space-y-4">
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
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

      {/* Grid: Kuis Latihan */}
      <div className="space-y-4 pt-4">
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
    </div>
  )
}
