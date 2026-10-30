import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/context/ToastContext"
import { getTugasById, getPengumpulanDetail, submitPengumpulanTugas } from "@/services/tugas"
import { normalizeTingkatRomawi, formatDate } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DetailPageSkeleton } from "@/components/ui/loading-skeletons"
import {
  ArrowLeft,
  ClipboardList,
  Clock,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  MessageSquare,
  Sparkles,
  Link2,
  BookOpen,
} from "lucide-react"

export function TugasDetail() {
  const { id } = useParams()
  const { currentUser, profileData } = useAuth()
  const { toast } = useToast()

  const [tugas, setTugas] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [tautanDrive, setTautanDrive] = useState("")
  const [catatanSiswa, setCatatanSiswa] = useState("")
  const [loading, setLoading] = useState(true)
  const [errorLoad, setErrorLoad] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")

  const studentTingkat = normalizeTingkatRomawi(profileData?.tingkat || profileData?.kelasNama)

  async function loadData() {
    if (!currentUser || !id) return
    setErrorLoad("")
    try {
      // 1. Ambil detail tugas terlebih dahulu
      const t = await getTugasById(id)
      setTugas(t)

      // 2. Ambil detail submission secara terpisah dan tangani gracefully jika dokumen belum pernah dibuat
      try {
        const sub = await getPengumpulanDetail(id, currentUser.uid)
        if (sub) {
          setSubmission(sub)
          setTautanDrive(sub.tautanDrive || "")
          setCatatanSiswa(sub.catatanSiswa || "")
        }
      } catch (subErr) {
        console.warn("Belum ada pengumpulan atau izin baca pengumpulan:", subErr)
      }
    } catch (err) {
      console.error("Gagal memuat detail tugas:", err)
      setErrorLoad(err.message || "Gagal memuat tugas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    loadData()
  }, [id, currentUser])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!currentUser) return

    if (isGraded) {
      toast.warning("Tugas Telah Dinilai", "Tugas ini sudah dinilai oleh guru dan tidak dapat diperbarui lagi.")
      return
    }

    if (isDeadlinePassed) {
      toast.warning("Batas Waktu Berakhir", "Batas waktu pengumpulan tugas ini telah terlewat.")
      return
    }

    if (!tautanDrive.trim()) {
      toast.warning("Tautan Belum Diisi", "Harap masukkan tautan link Google Drive atau dokumen tugas Anda.")
      return
    }

    // Validasi sederhana format link
    const cleanLink = tautanDrive.trim()
    if (!cleanLink.startsWith("http://") && !cleanLink.startsWith("https://")) {
      toast.warning("Format Tautan Tidak Valid", "Tautan harus diawali dengan https:// (contoh: https://drive.google.com/...)")
      return
    }

    setSubmitting(true)
    setSuccessMsg("")
    try {
      await submitPengumpulanTugas({
        tugasId: id,
        uid: currentUser.uid,
        nisn: profileData?.nisn || "",
        namaMurid: profileData?.nama || currentUser.displayName || "Siswa",
        kelasId: profileData?.kelasId || null,
        kelasNama: profileData?.kelasNama || "Kelas VIII",
        tautanDrive: cleanLink,
        catatanSiswa,
      })

      toast.success("Tugas Berhasil Dikumpulkan!", "Tautan tugasmu telah dikirimkan ke guru pengajar.")
      setSuccessMsg("Tugas berhasil dikumpulkan ke sistem!")
      await loadData()
      setTimeout(() => setSuccessMsg(""), 4000)
    } catch (err) {
      toast.error("Gagal Mengumpulkan", err.message || "Gagal mengumpulkan tugas.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <DetailPageSkeleton icon={ClipboardList} label="Menyiapkan lembar penugasan..." />
  }

  if (!tugas) {
    return (
      <div className="container max-w-md py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Tugas Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">
          {errorLoad
            ? `Kendala: ${errorLoad}`
            : "Penugasan ini mungkin telah dihapus, dalam status draf, atau belum dipublikasikan oleh pengajar."}
        </p>
        <Button asChild className="rounded-xl text-xs font-bold">
          <Link to="/murid/tugas">Kembali ke Daftar Tugas</Link>
        </Button>
      </div>
    )
  }

  // Cek otorisasi akses kelas: jika tugas memiliki target kelas spesifik
  const hasSpecificClasses = tugas.kelasIds && Array.isArray(tugas.kelasIds) && tugas.kelasIds.length > 0
  const isEnrolledInTaskClass =
    !hasSpecificClasses ||
    (profileData?.kelasId && tugas.kelasIds.includes(profileData.kelasId))

  if (hasSpecificClasses && !isEnrolledInTaskClass) {
    return (
      <div className="container max-w-md py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Akses Terbatas</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Tugas ini hanya diperuntukkan bagi siswa di kelas{" "}
          <strong className="text-slate-700">
            {tugas.kelasNamaList?.join(", ") || "tertentu"}
          </strong>
          . Akun Anda terdaftar di kelas yang berbeda.
        </p>
        <Button asChild className="rounded-xl text-xs font-bold">
          <Link to="/murid/tugas">Kembali ke Daftar Tugas</Link>
        </Button>
      </div>
    )
  }

  const isGraded = submission?.status === "dinilai" && submission?.nilai !== undefined
  const isDeadlinePassed = tugas.deadline ? new Date(tugas.deadline) < new Date() : false

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24">
      {/* Tombol Navigasi Kembali */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-2 text-slate-600 hover:text-slate-900 rounded-xl"
        >
          <Link to="/murid/tugas">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Kembali ke Daftar Tugas</span>
          </Link>
        </Button>


      </div>

      {/* Header Info Penugasan */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-5 sm:p-7 shadow-lg shadow-blue-500/10 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold">
            <ClipboardList className="w-3.5 h-3.5 text-blue-200" />
            <span>Tugas Mandiri &bull; Kelas {tugas.tingkat?.join(", ")}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-blue-100 bg-white/10 px-3 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>Batas: {tugas.deadline ? formatDate(tugas.deadline) : "Fleksibel"}</span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
          {tugas.judul}
        </h1>
      </div>

      {/* KARTU NILAI & FEEDBACK GURU (JIKA SUDAH DINILAI) */}
      {isGraded && (
        <Card className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 shadow-sm overflow-hidden animate-in fade-in">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xl shrink-0">
                  <Award className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Hasil Evaluasi Pengajar
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Tugas Selesai Dinilai
                  </h3>
                </div>
              </div>

              {/* Nilai Besar */}
              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-black text-emerald-600">
                  {submission.nilai}
                  <span className="text-base text-slate-400 font-bold">/100</span>
                </div>
              </div>
            </div>

            {/* Catatan / Feedback Guru */}
            {submission.catatanGuru && (
              <div className="p-4 rounded-2xl bg-white border border-emerald-200 text-xs sm:text-sm text-slate-800 space-y-1.5 leading-relaxed">
                <div className="font-extrabold text-emerald-800 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Umpan Balik dari Ibu Guru:</span>
                </div>
                <p className="italic bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  "{submission.catatanGuru}"
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* INSTRUKSI TUGAS */}
      <Card className="rounded-3xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 p-5 pb-3">
          <CardTitle className="text-sm font-extrabold text-slate-900">
            Instruksi & Petunjuk Pengerjaan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed rich-editor-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {tugas.deskripsi}
          </ReactMarkdown>
        </CardContent>
      </Card>

      {/* PANDUAN BERBAGI TAUTAN GOOGLE DRIVE (VISUAL & EDUKATIF) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/80 border border-amber-200/80 text-amber-950 space-y-2 text-xs leading-relaxed">
        <div className="font-extrabold text-amber-900 flex items-center gap-2 text-xs sm:text-sm">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Panduan Berbagi Tautan Google Drive / Dokumen:</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
          <li>Unggah dokumen atau tulisan tugasmu ke <b>Google Drive</b> (atau buat di Google Docs / Canva).</li>
          <li>Klik kanan file tersebut &rarr; pilih <b>Bagikan (Share)</b>.</li>
          <li>
            Pada bagian <i>Akses Umum</i>, ubah dari <i>Dibatasi</i> menjadi <b>"Siapa saja yang memiliki link" (Anyone with the link)</b> dengan peran <b>Pengakses lihat-saja (Viewer)</b>.
          </li>
          <li>Salin tautan link tersebut dan tempelkan pada kolom formulir di bawah ini.</li>
        </ol>
      </div>

      {/* FORMULIR PENGUMPULAN TUGAS */}
      <Card className="rounded-3xl border border-blue-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 p-5 pb-3 bg-gradient-to-r from-blue-50/40 to-white flex items-center justify-between">
          <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600" />
            <span>Formulir Pengumpulan Tugas</span>
          </CardTitle>

          {submission && (
            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
              Terkumpul: {formatDate(submission.submittedAt)}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="p-5 space-y-4 text-xs">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Kondisi Jika Tugas Sudah Dinilai atau Sudah Lewat Batas Waktu */}
          {isGraded ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pengumpulan Selesai & Telah Dinilai Guru</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Tugas ini telah dinilai oleh Ibu Guru. Tautan tugas dikunci dan tidak dapat diubah lagi.
              </p>
              {submission?.tautanDrive && (
                <div className="pt-1 flex items-center gap-2">
                  <a
                    href={submission.tautanDrive}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 border border-blue-200 transition-colors"
                  >
                    <span>Buka Tautan Tugas yang Dikumpulkan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : isDeadlinePassed ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Batas Waktu Pengumpulan Telah Berakhir</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Tenggat waktu untuk tugas ini telah terlewati ({formatDate(tugas.deadline)}). Pengumpulan atau pembaruan berkas tugas telah ditutup.
              </p>
              {submission?.tautanDrive && (
                <div className="pt-1 flex items-center gap-2">
                  <a
                    href={submission.tautanDrive}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-700 font-bold hover:bg-slate-50 border border-slate-200 transition-colors"
                  >
                    <span>Lihat Berkas Terakhir yang Dikirim</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Input URL Link Drive */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Tautan Link Dokumen Tugas (Google Drive / Canva / Dokumen Cloud)
                </label>
                <div className="relative">
                  <Input
                    type="url"
                    placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                    value={tautanDrive}
                    onChange={(e) => setTautanDrive(e.target.value)}
                    className="h-11 rounded-xl text-xs sm:text-sm font-medium pl-3 pr-28"
                    required
                  />
                  {tautanDrive && (
                    <a
                      href={tautanDrive}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <span>Cek Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Input Catatan Pengantar / Esai Singkat */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Catatan Pengantar atau Esai Ringkas (Opsional)
                </label>
                <Textarea
                  rows={4}
                  placeholder="Contoh: Selamat siang Ibu Ernawaty, berikut link Google Docs tugas teks rekon saya yang menceritakan pengalaman berkunjung ke Keraton Matan..."
                  value={catatanSiswa}
                  onChange={(e) => setCatatanSiswa(e.target.value)}
                  className="rounded-2xl text-xs sm:text-sm leading-relaxed p-3.5 bg-slate-50/50 focus:bg-white"
                />
              </div>

              {/* Tombol Kirim */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  <span>Anda dapat memperbarui tautan sebelum dinilai oleh guru atau sebelum batas waktu.</span>
                </span>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-10 px-5 shadow-xs gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {submitting
                      ? "Mengirimkan..."
                      : submission
                        ? "Perbarui Tautan Tugas"
                        : "Kumpulkan Tugas"}
                  </span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

