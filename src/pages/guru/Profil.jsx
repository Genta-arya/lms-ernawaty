import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { getGuruProfile, updateGuruProfile, getSekolahInfo } from "@/services/guru"
import { uploadToCloudinary, openCloudinaryCropWidget } from "@/services/cloudinary"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProfilSkeleton } from "@/components/ui/loading-skeletons"
import { AlertCircle, CheckCircle, UserCheck, KeyRound, Building2, Camera, Loader2, Trash2, ZoomIn } from "lucide-react"

export function Profil() {
  const { currentUser, updateLocalProfileNama, updateLocalProfileFoto } = useAuth()
  const fileInputRef = useRef(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [profile, setProfile] = useState({
    nama: "Ernawaty",
    nip: "",
    mapel: "Bahasa Indonesia",
    noHp: "",
    bio: "Guru Bahasa Indonesia di SMPN 3 Ketapang.",
    fotoUrl: "",
    email: "",
  })
  const [sekolah, setSekolah] = useState({ nama: "SMPN 3 Ketapang", alamat: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")

  // State Ganti Password
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")
  const [passwordErr, setPasswordErr] = useState("")
  const [changingPass, setChangingPass] = useState(false)

  useEffect(() => {
    async function load() {
      if (!currentUser) return
      try {
        const [p, s] = await Promise.all([
          getGuruProfile(currentUser.uid),
          getSekolahInfo(),
        ])
        if (p) setProfile((prev) => ({ ...prev, ...p }))
        if (s) setSekolah(s)
      } catch (err) {
        console.error("Gagal memuat profil:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentUser])

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setMsg("")
    setError("")

    try {
      await updateGuruProfile(currentUser.uid, {
        nama: profile.nama,
        nip: profile.nip,
        mapel: profile.mapel,
        noHp: profile.noHp,
        bio: profile.bio,
        fotoUrl: profile.fotoUrl,
      })
      if (updateLocalProfileNama) updateLocalProfileNama(profile.nama)
      setMsg("Data profil guru berhasil diperbarui.")
    } catch (err) {
      setError(err.message || "Gagal memperbarui profil.")
    } finally {
      setSaving(false)
    }
  }

  function handleOpenCropWidget() {
    setError("")
    setMsg("")
    setUploadingFoto(true)

    openCloudinaryCropWidget({
      onSuccess: async (uploadedUrl) => {
        try {
          await updateGuruProfile(currentUser.uid, { fotoUrl: uploadedUrl })
          setProfile((prev) => ({ ...prev, fotoUrl: uploadedUrl }))
          if (updateLocalProfileFoto) updateLocalProfileFoto(uploadedUrl)
          setMsg("Foto profil guru berhasil disesuaikan & diperbarui!")
        } catch (err) {
          setError(err.message || "Gagal menyimpan foto profil.")
        } finally {
          setUploadingFoto(false)
        }
      },
      onError: (err) => {
        setUploadingFoto(false)
        console.error(err)
        setError(err.message || "Gagal mengunggah foto profil.")
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
      setError("File tidak valid. Harap pilih gambar dengan format JPG, PNG, atau WEBP.")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran file terlalu besar! Maksimal ukuran foto adalah 2MB.")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setUploadingFoto(true)
    setError("")
    setMsg("")

    try {
      const url = await uploadToCloudinary(file)
      await updateGuruProfile(currentUser.uid, { fotoUrl: url })
      setProfile((prev) => ({ ...prev, fotoUrl: url }))
      if (updateLocalProfileFoto) updateLocalProfileFoto(url)
      setMsg("Foto profil guru berhasil diperbarui!")
    } catch (err) {
      console.error(err)
      setError(err.message || "Gagal mengunggah foto profil.")
    } finally {
      setUploadingFoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleHapusFoto() {
    if (!confirm("Hapus foto profil guru?")) return

    setUploadingFoto(true)
    setError("")
    setMsg("")

    try {
      await updateGuruProfile(currentUser.uid, { fotoUrl: "" })
      setProfile((prev) => ({ ...prev, fotoUrl: "" }))
      if (updateLocalProfileFoto) updateLocalProfileFoto("")
      setMsg("Foto profil guru berhasil dihapus.")
    } catch (err) {
      setError(err.message || "Gagal menghapus foto profil.")
    } finally {
      setUploadingFoto(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordErr("")
    setPasswordMsg("")
    setChangingPass(true)

    try {
      const cred = EmailAuthProvider.credential(currentUser.email, oldPassword)
      await reauthenticateWithCredential(currentUser, cred)
      await updatePassword(currentUser, newPassword)
      setPasswordMsg("Password berhasil diubah. Gunakan password baru saat login berikutnya.")
      setOldPassword("")
      setNewPassword("")
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPasswordErr("Password lama yang Anda masukkan salah.")
      } else {
        setPasswordErr(err.message || "Gagal mengubah password.")
      }
    } finally {
      setChangingPass(false)
    }
  }

  if (loading) {
    return <ProfilSkeleton />
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profil Guru</h1>
        <p className="text-sm text-muted-foreground">
          Kelola data diri pengajar dan pengaturan akun pengampu di {sekolah.nama}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Pengajar & Foto Profil */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center pb-2">
            {/* Avatar Pengajar dengan Upload Cloudinary & Preview Zoom */}
            <div className="relative mx-auto mb-2">
              <div
                onClick={() => {
                  if (profile.fotoUrl) setShowPreviewModal(true)
                }}
                className={`w-24 h-24 rounded-3xl bg-blue-50 border-2 border-blue-200/80 text-blue-700 font-black text-3xl flex items-center justify-center shadow-md overflow-hidden relative mx-auto group select-none ${
                  profile.fotoUrl ? "cursor-pointer hover:scale-102 transition-all" : ""
                }`}
                title={profile.fotoUrl ? "Klik untuk melihat foto profil ukuran penuh" : "Avatar Guru"}
              >
                {profile.fotoUrl ? (
                  <>
                    <img
                      src={profile.fotoUrl}
                      alt={profile.nama}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
                    </div>
                  </>
                ) : (
                  <span>{profile.nama?.charAt(0)?.toUpperCase() || "G"}</span>
                )}

                {uploadingFoto && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-5 h-5 animate-spin text-white mb-1" />
                    <span className="text-[9px] font-bold">Mengunggah...</span>
                  </div>
                )}
              </div>

              {/* Tombol Kamera Upload (Cloudinary Crop Widget) */}
              <button
                type="button"
                disabled={uploadingFoto}
                onClick={handleOpenCropWidget}
                title="Sesuaikan & Potong Foto Pengajar (Crop 1:1)"
                className="absolute -bottom-1 -right-1 p-2 rounded-2xl bg-white text-blue-600 shadow-md border border-slate-200 hover:bg-blue-50 hover:scale-110 active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Tombol Hapus Foto */}
              {profile.fotoUrl && !uploadingFoto && (
                <button
                  type="button"
                  onClick={handleHapusFoto}
                  title="Hapus Foto Profil"
                  className="absolute -top-1 -right-1 p-1.5 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 hover:scale-110 active:scale-95 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
              />
            </div>

            <CardTitle className="text-base font-bold">{profile.nama}</CardTitle>
            <p className="text-xs text-muted-foreground">{profile.mapel || "Guru Pengampu"}</p>
          </CardHeader>

          <CardContent className="space-y-2 text-xs border-t pt-4">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              {sekolah.nama}
            </div>
            <p className="text-muted-foreground">{sekolah.alamat || "Ketapang, Kalimantan Barat"}</p>
            <div className="pt-2 border-t mt-3">
              <span className="text-[11px] text-muted-foreground block">Email Terdaftar:</span>
              <span className="font-medium text-foreground">{currentUser?.email}</span>
            </div>
          </CardContent>
        </Card>

        {/* Form Profil */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              Informasi Pengajar
            </CardTitle>
            <CardDescription className="text-xs">
              Nama dan data ini akan ditampilkan pada beranda materi bagi siswa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {msg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex gap-2 mb-4">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{msg}</span>
              </div>
            )}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Nama Lengkap & Gelar</label>
                  <Input
                    value={profile.nama}
                    onChange={(e) => setProfile({ ...profile, nama: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">NIP (Opsional)</label>
                  <Input
                    placeholder="Contoh: 19800101..."
                    value={profile.nip || ""}
                    onChange={(e) => setProfile({ ...profile, nip: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Mata Pelajaran</label>
                  <Input
                    value={profile.mapel}
                    onChange={(e) => setProfile({ ...profile, mapel: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Nomor HP / WhatsApp</label>
                  <Input
                    placeholder="08..."
                    value={profile.noHp || ""}
                    onChange={(e) => setProfile({ ...profile, noHp: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Bio Singkat</label>
                <Textarea
                  rows={3}
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </div>

              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Ganti Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            Keamanan & Ganti Password
          </CardTitle>
          <CardDescription className="text-xs">
            Perbarui password login guru secara berkala untuk menjaga keamanan data sekolah.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex gap-2 mb-4">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{passwordMsg}</span>
            </div>
          )}
          {passwordErr && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordErr}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Password Saat Ini</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Password Baru (Minimal 6 Karakter)</label>
              <Input
                type="password"
                placeholder="••••••••"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" size="sm" variant="outline" disabled={changingPass}>
              {changingPass ? "Memperbarui..." : "Ubah Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* MODAL PREVIEW FOTO PROFIL GURU */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <DialogTitle className="text-sm sm:text-base font-extrabold text-slate-900">
                Foto Profil Pengajar
              </DialogTitle>
              <p className="text-xs text-slate-500 font-medium">
                {profile.nama} &bull; {profile.mapel || "Guru Pengampu"}
              </p>
            </div>
          </DialogHeader>

          <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-950/5">
            <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-slate-100 relative">
              <img
                src={profile.fotoUrl}
                alt={profile.nama}
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

