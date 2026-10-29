import React, { useState, useEffect } from "react"
import { getKelasList } from "@/services/kelas"
import { getMateriList } from "@/services/materi"
import { getMuridList } from "@/services/murid"
import { getAllProgres } from "@/services/progres"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProgresSkeleton } from "@/components/ui/loading-skeletons"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  BarChart3,
  CheckCircle2,
  Users,
  Search,
  BookOpen,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Clock,
  XCircle,
  Eye,
} from "lucide-react"

export function Progres() {
  const [kelasList, setKelasList] = useState([])
  const [materiList, setMateriList] = useState([])
  const [muridList, setMuridList] = useState([])
  const [progresList, setProgresList] = useState([])
  const [loading, setLoading] = useState(true)

  // State Modal Detail Siswa
  const [selectedCell, setSelectedCell] = useState(null)
  const [searchMurid, setSearchMurid] = useState("")
  const [filterTab, setFilterTab] = useState("all") // "all" | "selesai" | "belum"

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })

    async function loadData() {
      try {
        const [kelas, materi, murid, prog] = await Promise.all([
          getKelasList(),
          getMateriList(true),
          getMuridList(),
          getAllProgres(),
        ])
        setKelasList(kelas)
        setMateriList(materi)
        setMuridList(murid)
        setProgresList(prog)
      } catch (err) {
        console.error("Gagal memuat matriks progres:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Mapping murid ke kelas
  const muridToKelasMap = new Map()
  const muridByNisnMap = new Map()
  muridList.forEach((m) => {
    muridToKelasMap.set(m.nisn, m.kelasId)
    muridByNisnMap.set(m.nisn, m)
  })

  // Hitung jumlah murid per kelas
  const muridCountPerKelas = new Map()
  muridList.forEach((m) => {
    if (m.kelasId) {
      muridCountPerKelas.set(m.kelasId, (muridCountPerKelas.get(m.kelasId) || 0) + 1)
    }
  })

  // Map progres selesai: materiId -> Set(nisn)
  const materiSelesaiNisnMap = new Map()
  // Map timestamp selesai jika ada: `${nisn}_${materiId}` -> Date/string
  const progresDetailMap = new Map()

  progresList.forEach((p) => {
    if (p.selesai && p.nisn && p.materiId) {
      if (!materiSelesaiNisnMap.has(p.materiId)) {
        materiSelesaiNisnMap.set(p.materiId, new Set())
      }
      materiSelesaiNisnMap.get(p.materiId).add(p.nisn)
      progresDetailMap.set(`${p.nisn}_${p.materiId}`, p)
    }
  })

  // Matriks: kelasId -> materiId -> jumlahMuridSelesai
  const matrix = new Map()
  progresList.forEach((p) => {
    if (p.selesai && p.nisn) {
      const kelasId = muridToKelasMap.get(p.nisn)
      if (kelasId) {
        if (!matrix.has(kelasId)) {
          matrix.set(kelasId, new Map())
        }
        const kelasMateriMap = matrix.get(kelasId)
        kelasMateriMap.set(p.materiId, (kelasMateriMap.get(p.materiId) || 0) + 1)
      }
    }
  })

  // Hitung daftar siswa untuk dialog modal saat cell di-klik
  function getModalSiswaList() {
    if (!selectedCell) return []
    const { kelasId, materiId } = selectedCell

    // Ambil semua murid di kelas ini
    const kelasMurid = muridList.filter((m) => m.kelasId === kelasId)
    const selesaiSet = materiSelesaiNisnMap.get(materiId) || new Set()

    return kelasMurid.map((m) => {
      const isSelesai = selesaiSet.has(m.nisn)
      const prog = progresDetailMap.get(`${m.nisn}_${materiId}`)
      return {
        ...m,
        isSelesai,
        selesaiAt: prog?.updatedAt || prog?.createdAt || null,
      }
    })
  }

  const modalSiswaList = getModalSiswaList()
  const selesaiCountInModal = modalSiswaList.filter((s) => s.isSelesai).length
  const belumCountInModal = modalSiswaList.length - selesaiCountInModal

  const filteredModalSiswaList = modalSiswaList.filter((s) => {
    // Filter tab
    if (filterTab === "selesai" && !s.isSelesai) return false
    if (filterTab === "belum" && s.isSelesai) return false

    // Filter search text
    if (searchMurid.trim()) {
      const q = searchMurid.toLowerCase()
      const matchNama = s.nama?.toLowerCase().includes(q)
      const matchNisn = s.nisn?.toLowerCase().includes(q)
      return matchNama || matchNisn
    }
    return true
  })

  if (loading) {
    return <ProgresSkeleton />
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Halaman */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-5 sm:p-7 shadow-lg shadow-blue-500/10 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold">
          <BarChart3 className="w-3.5 h-3.5 text-blue-200" />
          <span>Monitoring Literasi & Ketuntasan Materi</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
          Matriks Progres Membaca
        </h1>
        <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
          Pantau ketuntasan membaca seluruh siswa tiap kelas. Klik pada salah satu kotak persentase kelas untuk melihat rincian nama siswa yang telah selesai membaca maupun yang belum.
        </p>
      </div>

      {/* Tabel Matriks Modern */}
      <Card className="rounded-3xl border border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span>Daftar Ketuntasan Materi per Kelas</span>
            </CardTitle>
            <p className="text-xs text-slate-500">
              Menampilkan {kelasList.length} kelas dan {materiList.length} modul ajar.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Klik nilai angka / bar untuk detail siswa</span>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="w-44 font-extrabold text-xs text-slate-700 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                  Kelas
                </TableHead>
                <TableHead className="w-28 font-bold text-xs text-slate-600">
                  Total Siswa
                </TableHead>
                {materiList.map((m) => (
                  <TableHead key={m.id} className="text-center min-w-[170px] py-3.5">
                    <div className="font-extrabold text-xs text-slate-800 line-clamp-1" title={m.judul}>
                      {m.judul}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                        {m.topik || "Bahasa Indonesia"}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                          m.status === "terbit"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {kelasList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={materiList.length + 2} className="text-center py-12 text-xs text-slate-400">
                    Belum ada kelas terdaftar di sistem.
                  </TableCell>
                </TableRow>
              ) : (
                kelasList.map((k) => {
                  const totalSiswaKelas = muridCountPerKelas.get(k.id) || 0
                  const kMap = matrix.get(k.id) || new Map()

                  return (
                    <TableRow key={k.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Kolom Nama Kelas Sticky */}
                      <TableCell className="font-extrabold text-xs text-slate-900 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e2e8f0]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {k.tingkat || k.nama?.charAt(0) || "K"}
                          </div>
                          <span>Kelas {k.nama}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{totalSiswaKelas} Siswa</span>
                        </span>
                      </TableCell>

                      {/* Sel Tiap Materi */}
                      {materiList.map((m) => {
                        const selesaiCount = kMap.get(m.id) || 0
                        const persen = totalSiswaKelas > 0 ? Math.round((selesaiCount / totalSiswaKelas) * 100) : 0
                        const isFull = totalSiswaKelas > 0 && selesaiCount === totalSiswaKelas

                        return (
                          <TableCell key={m.id} className="text-center p-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCell({
                                  kelasId: k.id,
                                  kelasNama: k.nama,
                                  materiId: m.id,
                                  materiJudul: m.judul,
                                  totalSiswa: totalSiswaKelas,
                                })
                                setSearchMurid("")
                                setFilterTab("all")
                              }}
                              className={`w-full group p-2 rounded-2xl border transition-all text-left flex flex-col items-center gap-1.5 ${
                                isFull
                                  ? "bg-emerald-50/70 border-emerald-200/90 hover:bg-emerald-100/70 hover:border-emerald-300"
                                  : selesaiCount > 0
                                  ? "bg-blue-50/50 border-blue-200/80 hover:bg-blue-100/60 hover:border-blue-300"
                                  : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
                              }`}
                              title={`Klik untuk lihat daftar siswa Kelas ${k.nama} pada modul ${m.judul}`}
                            >
                              <div className="flex items-center justify-between w-full px-1">
                                <span
                                  className={`font-black text-xs ${
                                    isFull
                                      ? "text-emerald-700"
                                      : selesaiCount > 0
                                      ? "text-blue-700"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {selesaiCount} / {totalSiswaKelas}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                    isFull
                                      ? "bg-emerald-200 text-emerald-800"
                                      : selesaiCount > 0
                                      ? "bg-blue-200 text-blue-800"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {persen}%
                                </span>
                              </div>

                              {/* Progress Bar Mini */}
                              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    isFull ? "bg-emerald-500" : "bg-blue-600"
                                  }`}
                                  style={{ width: `${persen}%` }}
                                />
                              </div>

                              <span className="text-[10px] font-semibold text-slate-400 group-hover:text-blue-600 flex items-center gap-0.5 pt-0.5">
                                <span>Lihat Siswa</span>
                                <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            </button>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIALOG POPUP: DETAIL SISWA SELESAI / BELUM PADA MATERI TERTENTU */}
      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border-b border-slate-100">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200/60 px-2.5 py-0.5 rounded-full w-fit">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Kelas {selectedCell?.kelasNama} &bull; Ketuntasan Belajar</span>
            </div>
            <DialogTitle className="text-base sm:text-lg font-black text-slate-900 mt-1">
              {selectedCell?.materiJudul}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Berikut rincian siswa yang telah menyelesaikan pembacaan modul ini.
            </DialogDescription>

            {/* Statistik Ringkas Modal */}
            <div className="grid grid-cols-3 gap-2 pt-3">
              <div className="p-2.5 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center">
                <div className="text-[11px] text-slate-500 font-semibold">Total Siswa</div>
                <div className="text-lg font-black text-slate-900">{modalSiswaList.length}</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-center">
                <div className="text-[11px] text-emerald-700 font-semibold">Sudah Selesai</div>
                <div className="text-lg font-black text-emerald-700">{selesaiCountInModal}</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-center">
                <div className="text-[11px] text-amber-700 font-semibold">Belum Membaca</div>
                <div className="text-lg font-black text-amber-700">{belumCountInModal}</div>
              </div>
            </div>
          </DialogHeader>

          {/* Filter & Search Bar */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Tab Filter Selesai / Belum */}
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/60 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    filterTab === "all"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Semua ({modalSiswaList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("selesai")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    filterTab === "selesai"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-emerald-700"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Selesai ({selesaiCountInModal})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("belum")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    filterTab === "belum"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-amber-700"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Belum ({belumCountInModal})</span>
                </button>
              </div>

              {/* Input Pencarian Siswa */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Cari nama atau NISN..."
                  value={searchMurid}
                  onChange={(e) => setSearchMurid(e.target.value)}
                  className="h-8.5 pl-8 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* List Siswa */}
            <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {filteredModalSiswaList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                  <Users className="w-8 h-8 mx-auto text-slate-300 opacity-60" />
                  <p className="font-semibold text-slate-600">Tidak ada siswa ditemukan</p>
                  <p className="text-[11px] text-slate-400">Coba ubah kata kunci atau ganti filter status.</p>
                </div>
              ) : (
                filteredModalSiswaList.map((s, idx) => (
                  <div
                    key={s.nisn}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          s.isSelesai
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                          {s.nama}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          NISN: {s.nisn} {s.email ? `• ${s.email}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {s.isSelesai ? (
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Tuntas Membaca</span>
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Belum Tuntas</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
