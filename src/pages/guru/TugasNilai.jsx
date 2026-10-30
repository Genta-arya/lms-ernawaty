import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { useToast } from "@/context/ToastContext"
import { getTugasById, getPengumpulanByTugas, gradePengumpulanTugas } from "@/services/tugas"
import { getMuridList } from "@/services/murid"
import { getKelasList } from "@/services/kelas"
import { exportToCsv } from "@/lib/csv"
import { formatDate } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DetailPageSkeleton } from "@/components/ui/loading-skeletons"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  ArrowLeft,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Users,
  Search,
  MessageSquare,
  Edit3,
  Calendar,
} from "lucide-react"

export function TugasNilai() {
  const { id } = useParams()
  const { toast } = useToast()
  const [tugas, setTugas] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [muridList, setMuridList] = useState([])
  const [kelasList, setKelasList] = useState([])
  const [selectedKelas, setSelectedKelas] = useState("SEMUA")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("sudah") // "sudah" | "belum"
  const [loading, setLoading] = useState(true)

  // Dialog Penilaian State
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [nilaiInput, setNilaiInput] = useState("")
  const [catatanInput, setCatatanInput] = useState("")
  const [savingGrade, setSavingGrade] = useState(false)

  async function loadData() {
    try {
      const [t, subs, mList, kList] = await Promise.all([
        getTugasById(id),
        getPengumpulanByTugas(id),
        getMuridList(),
        getKelasList(),
      ])
      setTugas(t)
      setSubmissions(subs)
      setMuridList(mList)
      setKelasList(kList)
    } catch (err) {
      console.error("Gagal memuat evaluasi tugas:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    loadData()
  }, [id])

  const kelasMap = new Map()
  kelasList.forEach((k) => kelasMap.set(k.id, k.nama))

  // Filter murid yang cocok dengan tingkat tugas ini
  const relevantMurid = muridList.filter((m) => {
    if (!tugas?.tingkat || tugas.tingkat.length === 0) return true
    // Cek apakah kelas murid cocok dengan tingkat tugas
    const kData = kelasList.find((k) => k.id === m.kelasId)
    const tingkat = kData?.tingkat || m.tingkat
    return tingkat && tugas.tingkat.includes(tingkat)
  })

  // Map pengumpulan per uid & per nisn
  const submissionMap = new Map()
  submissions.forEach((s) => {
    submissionMap.set(s.uid, s)
    if (s.nisn) submissionMap.set(s.nisn, s)
  })

  // Filter menurut kelas yang dipilih
  const filteredSubmissions = submissions.filter((s) => {
    if (selectedKelas !== "SEMUA" && s.kelasId !== selectedKelas) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchNama = s.namaMurid?.toLowerCase().includes(q)
      const matchNisn = s.nisn?.toLowerCase().includes(q)
      return matchNama || matchNisn
    }
    return true
  })

  // Murid yang belum mengumpulkan
  const muridBelumKumpul = relevantMurid.filter((m) => {
    const hasSubmitted = submissionMap.has(m.akunMurid?.uid) || submissionMap.has(m.nisn)
    if (hasSubmitted) return false
    if (selectedKelas !== "SEMUA" && m.kelasId !== selectedKelas) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchNama = m.nama?.toLowerCase().includes(q)
      const matchNisn = m.nisn?.toLowerCase().includes(q)
      return matchNama || matchNisn
    }
    return true
  })

  // Statistik Ringkas
  const totalRelevantMurid = selectedKelas === "SEMUA"
    ? relevantMurid.length
    : relevantMurid.filter((m) => m.kelasId === selectedKelas).length

  const totalSubmitted = filteredSubmissions.length
  const totalGraded = filteredSubmissions.filter((s) => s.status === "dinilai").length
  const totalNilai = filteredSubmissions.reduce((acc, curr) => acc + (curr.nilai || 0), 0)
  const rataRataNilai = totalGraded > 0 ? Math.round(totalNilai / totalGraded) : 0

  function handleOpenGradeModal(sub) {
    setSelectedSubmission(sub)
    setNilaiInput(sub.nilai !== undefined && sub.nilai !== null ? String(sub.nilai) : "")
    setCatatanInput(sub.catatanGuru || "")
  }

  async function handleSaveGrade(e) {
    e.preventDefault()
    if (!selectedSubmission) return

    const num = Number(nilaiInput)
    if (isNaN(num) || num < 0 || num > 100) {
      toast.warning("Rentang Nilai Tidak Valid", "Harap masukkan nilai skor tugas antara 0 sampai 100.")
      return
    }

    setSavingGrade(true)
    try {
      const subId = selectedSubmission.id || `${tugas.id}_${selectedSubmission.uid}`
      await gradePengumpulanTugas(subId, {
        nilai: num,
        catatanGuru: catatanInput,
      })
      setSelectedSubmission(null)
      toast.success("Nilai Tersimpan", `Nilai ${num} untuk ${selectedSubmission.namaMurid} berhasil dicatat.`)
      await loadData()
    } catch (err) {
      toast.error("Gagal Menyimpan", err.message || "Gagal menyimpan nilai tugas siswa.")
    } finally {
      setSavingGrade(false)
    }
  }

  function handleExportCsv() {
    const data = filteredSubmissions.map((s) => ({
      NISN: s.nisn || "-",
      Nama: s.namaMurid,
      Kelas: s.kelasNama || kelasMap.get(s.kelasId) || "-",
      TautanTugas: s.tautanDrive || "-",
      WaktuPengumpulan: formatDate(s.submittedAt),
      Nilai: s.nilai !== undefined && s.nilai !== null ? s.nilai : "Belum Dinilai",
      CatatanGuru: s.catatanGuru || "-",
    }))
    const safeJudul = (tugas?.judul || "Tugas").replace(/[^a-zA-Z0-9]/g, "_")
    exportToCsv(`Nilai_Tugas_${safeJudul}`, data)
    toast.success("Ekspor Berhasil", "Berkas rekapitulasi nilai CSV berhasil diunduh.")
  }

  if (loading) {
    return <DetailPageSkeleton icon={Award} label="Memuat evaluasi tugas siswa..." />
  }

  if (!tugas) {
    return (
      <div className="container max-w-md py-20 text-center space-y-4">
        <p className="font-semibold text-slate-800 text-sm">Tugas tidak ditemukan.</p>
        <Button asChild className="rounded-xl text-xs font-bold">
          <Link to="/guru/tugas">Kembali ke Daftar Tugas</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-xl shrink-0">
            <Link to="/guru/tugas">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Evaluasi Penugasan
              </h1>
              <Badge variant="outline" className="text-xs font-bold text-blue-700 bg-blue-50">
                {tugas.judul}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span>Sasaran: <b>Kelas {tugas.tingkat?.join(", ")}</b></span>
              <span>&bull;</span>
              <span>Batas Waktu: <b>{tugas.deadline ? formatDate(tugas.deadline) : "Tidak ada"}</b></span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="rounded-xl text-xs font-bold gap-1.5 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor Hasil CSV</span>
        </Button>
      </div>

      {/* Ringkasan Angka (KPI) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-2xl border-slate-200/90 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Siswa Sasaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{totalRelevantMurid} Siswa</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Siswa terdaftar di kelas</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/90 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sudah Mengumpulkan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600">{totalSubmitted}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {totalRelevantMurid > 0
                ? `${Math.round((totalSubmitted / totalRelevantMurid) * 100)}% ketuntasan tugas`
                : "0%"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/90 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sudah Dinilai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{totalGraded}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {totalSubmitted - totalGraded > 0
                ? `${totalSubmitted - totalGraded} tugas menunggu dinilai`
                : "Semua sudah dinilai"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/90 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rata-rata Nilai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-indigo-600">
              {totalGraded > 0 ? `${rataRataNilai} / 100` : "-"}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Dari {totalGraded} tugas dinilai</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Tab Sudah vs Belum Kumpul */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("sudah")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "sudah"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Sudah Mengumpulkan ({filteredSubmissions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("belum")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "belum"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Belum Mengumpulkan ({muridBelumKumpul.length})</span>
          </button>
        </div>

        {/* Filter Kelas & Search */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
          <select
            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:outline-none"
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
          >
            <option value="SEMUA">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                Kelas {k.nama}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari siswa atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Tabel Konten */}
      {activeTab === "sudah" ? (
        <Card className="rounded-3xl border border-slate-200 shadow-2xs overflow-hidden bg-white">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-700">Nama Siswa</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">NISN</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Kelas</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Waktu Kirim</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Tautan Tugas</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Catatan Siswa</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Nilai & Status</TableHead>
                  <TableHead className="text-right font-bold text-xs text-slate-700">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-xs text-slate-400">
                      Belum ada siswa yang mengumpulkan tugas untuk kriteria ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubmissions.map((sub) => {
                    const isGraded = sub.status === "dinilai" && sub.nilai !== undefined

                    return (
                      <TableRow key={sub.id || sub.uid} className="hover:bg-slate-50/60">
                        <TableCell className="font-extrabold text-xs text-slate-900">
                          {sub.namaMurid}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {sub.nisn || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-700">
                          {sub.kelasNama || kelasMap.get(sub.kelasId) || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(sub.submittedAt)}
                        </TableCell>
                        <TableCell>
                          {sub.tautanDrive ? (
                            <a
                              href={sub.tautanDrive}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors"
                              title="Buka dokumen tugas di Google Drive / Cloud"
                            >
                              <span>Buka Dokumen</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Tidak ada tautan</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-xs truncate" title={sub.catatanSiswa}>
                          {sub.catatanSiswa || "-"}
                        </TableCell>
                        <TableCell>
                          {isGraded ? (
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-xs px-2 py-0.5">
                                Nilai: {sub.nilai}
                              </Badge>
                              {sub.catatanGuru && (
                                <span title={`Umpan balik: ${sub.catatanGuru}`}>
                                  <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                              Menunggu Dinilai
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={isGraded ? "outline" : "default"}
                            onClick={() => handleOpenGradeModal(sub)}
                            className={`rounded-xl text-xs font-bold h-8 px-3 gap-1 ${
                              isGraded
                                ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isGraded ? "Edit Nilai" : "Beri Nilai"}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Tabel Siswa Belum Mengumpulkan */
        <Card className="rounded-3xl border border-slate-200 shadow-2xs overflow-hidden bg-white">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-700">Nama Siswa</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">NISN</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Kelas</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Status Tugas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {muridBelumKumpul.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-xs text-emerald-600 font-bold">
                      Luar biasa! Semua siswa telah mengumpulkan tugas ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  muridBelumKumpul.map((m) => (
                    <TableRow key={m.nisn}>
                      <TableCell className="font-extrabold text-xs text-slate-900">{m.nama}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{m.nisn}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700">
                        {kelasMap.get(m.kelasId) || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 font-bold">
                          Belum Mengumpulkan
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* DIALOG FORM PENILAIAN & FEEDBACK GURU */}
      <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <DialogContent className="max-w-md rounded-3xl p-5 sm:p-6 border-slate-200">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base sm:text-lg font-black text-slate-900">
              Penilaian & Umpan Balik Guru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Siswa: <b>{selectedSubmission?.namaMurid}</b> ({selectedSubmission?.kelasNama || "Siswa"})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGrade} className="space-y-4 pt-2">
            {/* Tautan Dokumen */}
            {selectedSubmission?.tautanDrive && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-semibold truncate mr-2">
                  Tautan Tugas Siswa:
                </span>
                <a
                  href={selectedSubmission.tautanDrive}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline shrink-0"
                >
                  <span>Buka di Tab Baru</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Input Skor Angka */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Skor / Nilai (0 - 100):</label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="Contoh: 85"
                value={nilaiInput}
                onChange={(e) => setNilaiInput(e.target.value)}
                className="h-10 rounded-xl text-base font-black text-blue-700"
                required
                autoFocus
              />
            </div>

            {/* Catatan / Feedback Ulasan Guru */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Catatan Evaluasi & Umpan Balik Guru (Dilihat Siswa):
              </label>
              <Textarea
                rows={4}
                placeholder="Contoh: Bagus sekali, struktur teks sudah lengkap dan runut. Perhatikan kembali penggunaan tanda baca titik dan huruf kapital di awal kalimat."
                value={catatanInput}
                onChange={(e) => setCatatanInput(e.target.value)}
                className="rounded-xl text-xs leading-relaxed p-3 bg-slate-50/50 focus:bg-white"
              />
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedSubmission(null)}
                className="rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={savingGrade}
                className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {savingGrade ? "Menyimpan..." : "Simpan Nilai"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

