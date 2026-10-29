import React, { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { updateMuridNama, updateMuridFotoUrl } from "@/services/murid"
import { uploadToCloudinary, openCloudinaryCropWidget } from "@/services/cloudinary"
import { getProgresMurid } from "@/services/progres"
import { getPercobaanByMurid } from "@/services/percobaan"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  User,
  GraduationCap,
  ShieldCheck,
  Edit3,
  Check,
  X,
  LogOut,
  ArrowLeft,
  Mail,
  Fingerprint,
  BookOpen,
  Trophy,
  History,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Camera,
  Loader2,
  Trash2,
  ZoomIn,
} from "lucide-react"

export function Profil() {
  const { currentUser, role, profileData, updateLocalProfileNama, updateLocalProfileFoto, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  // State Edit Nama
  const [isEditing, setIsEditing] = useState(false)
  const [namaInput, setNamaInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  // State Upload Foto Cloudinary
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // State Statistik Belajar
  const [totalMateriSelesai, setTotalMateriSelesai] = useState(0)
  const [totalKuisSelesai, setTotalKuisSelesai] = useState(0)

  const displayName = profileData?.nama || currentUser?.displayName || "Siswa"
  const fotoUrl = profileData?.fotoUrl || currentUser?.photoURL || null
  const initial = displayName.charAt(0).toUpperCase()
  const nisn = profileData?.nisn || ""
  const kelasNama = profileData?.kelasNama || (profileData?.tingkat ? `Kelas ${profileData.tingkat}` : "-")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    setNamaInput(displayName)

    async function loadStats() {
      if (!currentUser) return
      try {
        const [progresMap, percobaanList] = await Promise.all([
          getProgresMurid(currentUser.uid),
          getPercobaanByMurid(currentUser.uid),
        ])

        const selesaiCount = Object.values(progresMap || {}).filter(Boolean).length
        setTotalMateriSelesai(selesaiCount)

        const distinctKuis = new Set((percobaanList || []).map((p) => p.kuisId))
        setTotalKuisSelesai(distinctKuis.size)
      } catch (e) {
        console.warn("Gagal memuat statistik belajar:", e)
      }
    }
    loadStats()
  }, [currentUser, displayName])

  async function handleSaveNama(e) {
    if (e) e.preventDefault()
    const clean = namaInput.trim()

    if (!clean) {
      setErrorMsg("Nama tidak boleh kosong.")
      return
    }

    if (clean === displayName) {
      setIsEditing(false)
      return
    }

    setSaving(true)
    setErrorMsg("")
    setSuccessMsg("")

    try {
      await updateMuridNama(nisn, currentUser?.uid, clean)
      updateLocalProfileNama(clean)
      setSuccessMsg("Nama profil berhasil diperbarui!")
      setIsEditing(false)

      setTimeout(() => {
        setSuccessMsg("")
      }, 4000)
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || "Gagal memperbarui nama profil.")
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit() {
    setNamaInput(displayName)
    setIsEditing(false)
    setErrorMsg("")
  }

  function handleOpenCropWidget() {
    setErrorMsg("")
    setSuccessMsg("")
    setUploadingFoto(true)

    openCloudinaryCropWidget({
      onSuccess: async (uploadedUrl) => {
        try {
          await updateMuridFotoUrl(nisn, currentUser?.uid, uploadedUrl)
          updateLocalProfileFoto(uploadedUrl)
          setSuccessMsg("Foto profil berhasil disesuaikan & diperbarui!")
          setTimeout(() => setSuccessMsg(""), 4000)
        } catch (err) {
          console.error(err)
          setErrorMsg(err.message || "Gagal menyimpan foto profil.")
        } finally {
          setUploadingFoto(false)
        }
      },
      onError: (err) => {
        setUploadingFoto(false)
        console.error(err)
        setErrorMsg(err.message || "Gagal mengunggah foto profil.")
      },
      onClose: () => {
        setUploadingFoto(false)
      },
    })
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validasi tipe & ukuran di sisi klien sebelum proses
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg("File tidak valid. Harap pilih gambar dengan format JPG, PNG, atau WEBP.")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Ukuran file terlalu besar! Maksimal ukuran foto adalah 2MB.")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setUploadingFoto(true)
    setErrorMsg("")
    setSuccessMsg("")

    try {
      // 1. Upload ke Cloudinary
      const uploadedUrl = await uploadToCloudinary(file)

      // 2. Simpan URL ke Firestore & Firebase Auth
      await updateMuridFotoUrl(nisn, currentUser?.uid, uploadedUrl)

      // 3. Update state lokal instan
      updateLocalProfileFoto(uploadedUrl)

      setSuccessMsg("Foto profil berhasil diperbarui!")
      setTimeout(() => setSuccessMsg(""), 4000)
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || "Gagal mengunggah foto profil.")
    } finally {
      setUploadingFoto(false)
      // Reset input agar bisa memilih file yang sama lagi jika perlu
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleHapusFoto() {
    const ok = confirm("Hapus foto profil dan gunakan avatar inisial?")
    if (!ok) return

    setUploadingFoto(true)
    setErrorMsg("")
    setSuccessMsg("")

    try {
      await updateMuridFotoUrl(nisn, currentUser?.uid, "")
      updateLocalProfileFoto("")
      setSuccessMsg("Foto profil berhasil dihapus.")
      setTimeout(() => setSuccessMsg(""), 4000)
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || "Gagal menghapus foto profil.")
    } finally {
      setUploadingFoto(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate("/")
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* Tombol Kembali ke Dashboard */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-600 hover:text-slate-900">
          <Link to="/murid">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Materi
          </Link>
        </Button>
      </div>

      {/* 1. HERO PROFILE CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white p-6 sm:p-8 shadow-xl shadow-blue-500/10">
        {/* Background glow circle */}
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar Besar dengan Upload Cloudinary & Preview Zoom */}
          <div className="relative group shrink-0">
            <div
              onClick={() => {
                if (fotoUrl) setShowPreviewModal(true)
              }}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-white/30 text-white font-black text-3xl sm:text-4xl flex items-center justify-center shadow-lg overflow-hidden relative select-none ${
                fotoUrl ? "cursor-pointer hover:opacity-95 hover:scale-102 transition-all" : ""
              }`}
              title={fotoUrl ? "Klik untuk melihat foto profil ukuran penuh" : "Avatar Siswa"}
            >
              {fotoUrl ? (
                <>
                  <img
                    src={fotoUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
                  </div>
                </>
              ) : (
                <span>{initial}</span>
              )}

              {/* Overlay saat mengunggah */}
              {uploadingFoto && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin text-white mb-1" />
                  <span className="text-[9px] font-bold">Mengunggah...</span>
                </div>
              )}
            </div>

            {/* Tombol Ganti Foto (Cloudinary Crop Widget) */}
            <button
              type="button"
              disabled={uploadingFoto}
              onClick={handleOpenCropWidget}
              title="Sesuaikan & Potong Foto Profil (Crop 1:1)"
              className="absolute -bottom-1 -right-1 p-2 rounded-2xl bg-white text-blue-600 shadow-md border border-slate-200 hover:bg-blue-50 hover:scale-110 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Tombol Hapus Foto jika ada */}
            {fotoUrl && !uploadingFoto && (
              <button
                type="button"
                onClick={handleHapusFoto}
                title="Hapus Foto Profil"
                className="absolute -top-1 -right-1 p-1.5 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 hover:scale-110 active:scale-95 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}

            {/* Hidden Input File */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />
          </div>

          {/* Info Utama */}
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-none text-xs font-bold">
                Siswa Aktif
              </Badge>
              <Badge className="bg-emerald-500 text-white border-none text-xs font-semibold">
                SMPN 3 Ketapang
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {displayName}
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-blue-100 font-medium">
              <span>NISN: <b>{nisn || "-"}</b></span>
              <span>&bull;</span>
              <span><b>{kelasNama}</b></span>
              <span>&bull;</span>
              <span>{currentUser?.email || "-"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifikasi Sukses */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Notifikasi Error */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. CARD: INFORMASI AKUN & EDIT NAMA */}
      <Card className="rounded-3xl border border-slate-200/90 shadow-xs bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Informasi Pribadi Siswa
          </CardTitle>
          <CardDescription className="text-xs">
            Data identitas siswa yang terdaftar di sistem LMS Mandiri. Klik tombol edit untuk memperbarui nama.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* FIELD 1: NAMA LENGKAP (BISA DI-EDIT) */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Nama Lengkap Siswa:
              </label>

              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold transition-all active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Nama</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                >
                  Batal
                </button>
              )}
            </div>

            {!isEditing ? (
              <div
                onClick={() => setIsEditing(true)}
                title="Klik untuk mengubah nama"
                className="group flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:border-blue-400 hover:shadow-xs transition-all"
              >
                <span className="font-extrabold text-slate-900 text-sm">
                  {displayName}
                </span>
                <span className="text-xs text-blue-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <span>Klik untuk edit</span>
                  <Edit3 className="w-3 h-3" />
                </span>
              </div>
            ) : (
              <form onSubmit={handleSaveNama} className="space-y-3 pt-1">
                <Input
                  type="text"
                  value={namaInput}
                  onChange={(e) => setNamaInput(e.target.value)}
                  placeholder="Ketik nama lengkap Anda..."
                  autoFocus
                  disabled={saving}
                  className="h-11 rounded-xl bg-white text-sm font-semibold border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-[11px] text-slate-500">
                  Pastikan nama sesuai dengan yang tercantum di buku rapor atau daftar hadir kelas.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving}
                    className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={handleCancelEdit}
                    className="h-9 px-4 rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* FIELD 2: NISN (TERKUNCI / VERIFIED) */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Nomor Induk Siswa Nasional (NISN):
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Terverifikasi
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 font-mono font-bold text-slate-800 text-sm">
              {nisn || "-"}
            </div>
            <p className="text-[11px] text-slate-400">
              NISN bersifat unik dan dikelola oleh admin sekolah. Hubungi guru jika terdapat ketidaksesuaian NISN.
            </p>
          </div>

          {/* FIELD 3: KELAS & EMAIL GOOGLE (GRID 2 KOLOM) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kelas */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                Kelas Terdaftar:
              </label>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 font-bold text-slate-800 text-xs">
                {kelasNama}
              </div>
            </div>

            {/* Email Google */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-600" />
                Email Google Siswa:
              </label>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-slate-800 text-xs font-medium truncate" title={currentUser?.email}>
                {currentUser?.email || "-"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. CARD: STATISTIK BELAJAR */}
      <Card className="rounded-3xl border border-slate-200/90 shadow-xs bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Capaian Belajar Anda
          </CardTitle>
          <CardDescription className="text-xs">
            Ringkasan progres materi dan pengerjaan kuis formatif di platform LMS Mandiri.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-blue-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{totalMateriSelesai}</div>
                <div className="text-xs text-slate-500 font-medium">Modul Materi Telah Dibaca</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-amber-500/20">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-black text-slate-900">{totalKuisSelesai}</div>
                <div className="text-xs text-slate-500 font-medium">Set Kuis Dikerjakan</div>
              </div>
              <Button size="sm" variant="ghost" asChild className="text-amber-800 hover:bg-amber-100 text-xs">
                <Link to="/murid/riwayat">
                  Riwayat
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. LOGOUT BUTTON */}
      <div className="flex w-full justify-center pt-2">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="rounded-2xl w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Akun Siswa</span>
        </Button>
      </div>

      {/* 5. MODAL PREVIEW FOTO PROFIL */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <DialogTitle className="text-sm sm:text-base font-extrabold text-slate-900">
                Foto Profil Siswa
              </DialogTitle>
              <p className="text-xs text-slate-500 font-medium">
                {displayName} &bull; {kelasNama}
              </p>
            </div>
          </DialogHeader>

          <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-950/5">
            <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-slate-100 relative">
              <img
                src={fotoUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPreviewModal(false)
                handleOpenCropWidget()
              }}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span>Ganti / Potong Ulang</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setShowPreviewModal(false)}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

