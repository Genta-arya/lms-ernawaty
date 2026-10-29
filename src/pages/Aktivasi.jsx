import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { getKlaimByUid, submitKlaim, checkNisnDuplicate, batalKlaim } from "@/services/klaim"
import { getKelasList } from "@/services/kelas"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AktivasiSkeleton } from "@/components/ui/loading-skeletons"
import {
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  LogOut,
  ShieldAlert,
  Copy,
  Check,
  GraduationCap,
  Loader2,
  XCircle,
  Edit2,
} from "lucide-react"

export function Aktivasi() {
  const { currentUser, role, refreshUserRole, logout } = useAuth()
  const [nisn, setNisn] = useState("")
  const [nama, setNama] = useState("")
  const [kelasId, setKelasId] = useState("")
  const [kelasList, setKelasList] = useState([])
  const [klaim, setKlaim] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [copied, setCopied] = useState(false)

  // Real-time NISN validation states
  const [nisnChecking, setNisnChecking] = useState(false)
  const [nisnError, setNisnError] = useState("")
  const [nisnAvailable, setNisnAvailable] = useState(false)

  const navigate = useNavigate()

  const isPasswordProvider = currentUser?.providerData?.some(
    (p) => p.providerId === "password"
  )

  useEffect(() => {
    if (role === "guru") {
      navigate("/guru", { replace: true })
      return
    }
    if (role === "murid") {
      navigate("/murid", { replace: true })
      return
    }

    async function loadData() {
      if (currentUser) {
        try {
          const [k, kelasData] = await Promise.all([
            getKlaimByUid(currentUser.uid),
            getKelasList(),
          ])
          setKlaim(k)
          setKelasList(kelasData)

          if (k) {
            setNisn(k.nisn || "")
            setNama(k.nama || "")
            setKelasId(k.kelasId || "")
          } else {
            if (currentUser.displayName) {
              setNama(currentUser.displayName)
            }
            if (kelasData.length > 0) {
              setKelasId(kelasData[0].id)
            }
          }
        } catch (err) {
          console.error("Gagal memuat status klaim atau kelas:", err)
        } finally {
          setLoading(false)
        }
      }
    }
    loadData()
  }, [currentUser, role, navigate])

  // Real-time NISN debounced validation check
  useEffect(() => {
    const cleanNisn = nisn.trim()

    if (!cleanNisn) {
      setNisnError("")
      setNisnAvailable(false)
      setNisnChecking(false)
      return
    }

    if (cleanNisn.length < 10) {
      setNisnError(`Kurang ${10 - cleanNisn.length} digit lagi (${cleanNisn.length}/10 digit)`)
      setNisnAvailable(false)
      setNisnChecking(false)
      return
    }

    if (cleanNisn.length === 10) {
      setNisnChecking(true)
      setNisnError("")
      setNisnAvailable(false)

      const timer = setTimeout(async () => {
        try {
          const check = await checkNisnDuplicate(cleanNisn, currentUser?.uid)
          if (check.isDuplicate === true) {
            setNisnError(check.reason)
            setNisnAvailable(false)
          } else if (check.isDuplicate === false) {
            setNisnError("")
            setNisnAvailable(true)
          } else {
            // Ada permission error Firestore atau kegagalan query
            setNisnError(check.reason || "Gagal memverifikasi keunikan NISN.")
            setNisnAvailable(false)
          }
        } catch (err) {
          console.error("Gagal cek duplikasi NISN:", err)
          setNisnError("Terjadi kesalahan saat memeriksa NISN.")
          setNisnAvailable(false)
        } finally {
          setNisnChecking(false)
        }
      }, 350)

      return () => clearTimeout(timer)
    }
  }, [nisn, currentUser])

  function handleCopyUid() {
    if (currentUser?.uid) {
      navigator.clipboard.writeText(currentUser.uid)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setSuccessMsg("")

    const cleanNisn = nisn.trim()
    const cleanNama = nama.trim()

    if (!/^\d{10}$/.test(cleanNisn)) {
      setError("NISN harus tepat 10 digit angka.")
      return
    }

    if (cleanNama.length < 3) {
      setError("Nama lengkap siswa minimal harus 3 karakter.")
      return
    }

    if (!kelasId) {
      setError("Silakan pilih kelas Anda terlebih dahulu.")
      return
    }

    if (nisnError) {
      setError(nisnError)
      return
    }

    setSubmitting(true)
    try {
      await submitKlaim(currentUser, cleanNisn, cleanNama, kelasId)
      const updated = await getKlaimByUid(currentUser.uid)
      setKlaim(updated)
      setSuccessMsg("Permintaan aktivasi berhasil diajukan! Menunggu persetujuan Ibu Guru.")
    } catch (err) {
      console.error(err)
      setError(err.message || "Gagal mengirim permintaan aktivasi.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBatalPengajuan() {
    if (!currentUser) return
    const ok = confirm("Apakah Anda yakin ingin membatalkan dan mengubah data pengajuan aktivasi?")
    if (!ok) return

    setCancelling(true)
    try {
      await batalKlaim(currentUser.uid)
      setKlaim(null)
      setError("")
      setSuccessMsg("Pengajuan sebelumnya dibatalkan. Silakan periksa dan perbaiki NISN atau data Anda.")
    } catch (err) {
      alert("Gagal membatalkan pengajuan: " + (err.message || "Terjadi kesalahan."))
    } finally {
      setCancelling(false)
    }
  }

  async function handleRefresh() {
    setLoading(true)
    await refreshUserRole()
    if (currentUser) {
      const k = await getKlaimByUid(currentUser.uid)
      setKlaim(k)
    }
    setLoading(false)
  }

  if (loading) {
    return <AktivasiSkeleton />
  }

  // Jika akun adalah login Email & Password (Akun Guru), tampilkan panduan aktivasi Firestore
  if (isPasswordProvider) {
    return (
      <div className="container max-w-lg py-12">
        <Card className="shadow-lg border-primary/30">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold">Akun Guru Terdeteksi</CardTitle>
            <CardDescription className="text-xs">
              Akun email <b>{currentUser?.email}</b> berhasil login dengan Email & Password, namun dokumen profil di Firestore belum dibuat.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="p-4 bg-muted/50 rounded-xl border space-y-2">
              <span className="font-semibold text-foreground block">User UID Akun Anda:</span>
              <div className="flex items-center gap-2">
                <code className="bg-background px-2.5 py-1.5 rounded border text-[11px] font-mono flex-1 select-all break-all text-primary font-bold">
                  {currentUser?.uid}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyUid} className="h-8 gap-1 shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Tersalin" : "Salin UID"}
                </Button>
              </div>
            </div>

            <div className="space-y-2 border-l-2 border-primary/50 pl-3">
              <p className="font-bold text-foreground">Langkah Membuat Dokumen Guru di Firebase Console:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground leading-relaxed">
                <li>Buka <b>Firebase Console</b> &rarr; <b>Firestore Database</b>.</li>
                <li>Klik <b>+ Start collection</b>, beri nama koleksi: <code className="bg-muted px-1 rounded text-foreground font-semibold">guru</code></li>
                <li>Pada <b>Document ID</b>, tempelkan <b>User UID</b> di atas.</li>
                <li>Tambahkan field berikut:
                  <ul className="list-disc list-inside pl-4 pt-1 space-y-0.5">
                    <li><code className="bg-muted px-1 rounded">nama</code> (string): <span className="text-foreground font-semibold">Ernawaty</span></li>
                    <li><code className="bg-muted px-1 rounded">mapel</code> (string): <span className="text-foreground font-semibold">Bahasa Inggris</span></li>
                    <li><code className="bg-muted px-1 rounded">email</code> (string): <span className="text-foreground font-semibold">{currentUser?.email}</span></li>
                  </ul>
                </li>
                <li>Klik <b>Save</b>, lalu tekan tombol periksa di bawah.</li>
              </ol>
            </div>

            <Button onClick={handleRefresh} className="w-full gap-2 mt-2">
              <RefreshCw className="w-4 h-4" />
              Sudah Dibuat, Cek Ulang Status Guru
            </Button>
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-4">
            <Button variant="ghost" size="sm" onClick={() => logout()} className="text-xs text-muted-foreground">
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Keluar Akun
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Tampilan Akun Siswa (Google Login)
  return (
    <div className="container max-w-lg py-12">
      <Card className="shadow-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
            <GraduationCap className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Aktivasi Akun Murid</CardTitle>
          <CardDescription className="text-xs">
            Akun Google Anda (<b>{currentUser?.email}</b>) berhasil masuk. Lengkapi data di bawah untuk terhubung ke kelas Anda di SMPN 3 Ketapang.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {klaim?.status === "menunggu" ? (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-amber-950 text-base">Permintaan Aktivasi Sedang Ditinjau</h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Pengajuan akun Anda sudah terkirim ke dashboard guru. Ibu Guru Ernawaty akan segera memverifikasi data Anda.
                </p>
              </div>

              {/* Rincian Pengajuan */}
              <div className="bg-white/80 backdrop-blur rounded-xl p-3 border border-amber-200/80 text-left text-xs space-y-1.5 font-medium">
                <div className="flex justify-between items-center text-slate-600">
                  <span>NISN Terdaftar:</span>
                  <span className="font-mono font-bold text-slate-900 bg-amber-100/50 px-2 py-0.5 rounded">
                    {klaim.nisn}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Nama Lengkap:</span>
                  <span className="font-bold text-slate-900">{klaim.nama}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Status:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                    <Clock className="w-3 h-3" />
                    Menunggu Persetujuan
                  </span>
                </div>
              </div>

              {/* Aksi: Cek Ulang & Batal/Ubah */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="w-full sm:w-auto gap-2 bg-white text-xs h-9 font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Cek Status Persetujuan
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={cancelling}
                  onClick={handleBatalPengajuan}
                  className="w-full sm:w-auto gap-1.5 text-xs h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{cancelling ? "Membatalkan..." : "Ubah Data Pengajuan"}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {klaim?.status === "ditolak" && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs mb-6 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Permintaan Sebelumnya Ditolak
                  </div>
                  <p>Catatan Guru: {klaim.catatan || "Data NISN atau nama tidak sesuai."}</p>
                  <p className="pt-1 font-medium">Silakan periksa kembali data Anda di bawah ini dan ajukan ulang.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* 1. Pilih Kelas */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Pilih Kelas Anda</label>
                  {kelasList.length === 0 ? (
                    <div className="p-3 bg-muted rounded-xl border text-muted-foreground text-xs">
                      Belum ada data kelas dari guru. Hubungi guru pengampu untuk membuat kelas terlebih dahulu.
                    </div>
                  ) : (
                    <select
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={kelasId}
                      onChange={(e) => setKelasId(e.target.value)}
                      required
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {kelasList.map((k) => (
                        <option key={k.id} value={k.id}>
                          Kelas {k.nama} (Tingkat {k.tingkat}) - TA {k.tahunAjaran}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-[10px] text-muted-foreground">Pilih kelas tempat Anda belajar di SMPN 3 Ketapang.</p>
                </div>

                {/* 2. NISN dengan Validasi Real-time */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-foreground">NISN (10 Digit Angka)</label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
                      1 Siswa 1 Akun Unik
                    </span>
                  </div>

                  <div className="relative">
                    <Input
                      type="text"
                      maxLength={10}
                      placeholder="Contoh: 0081234567"
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value.replace(/\D/g, ""))}
                      className={`font-mono tracking-widest text-xs h-11 pr-8 transition-all ${
                        nisnAvailable
                          ? "border-emerald-500 ring-2 ring-emerald-500/20"
                          : nisnError && nisn.length === 10
                          ? "border-rose-500 ring-2 ring-rose-500/20"
                          : ""
                      }`}
                      required
                    />

                    <div className="absolute right-3 top-3.5">
                      {nisnChecking && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      )}
                      {!nisnChecking && nisnAvailable && (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                      {!nisnChecking && nisnError && nisn.length === 10 && (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                  </div>

                  {/* Pesan Validasi Real-time NISN */}
                  <div className="min-h-[18px]">
                    {nisnChecking ? (
                      <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Memeriksa ketersediaan NISN...
                      </p>
                    ) : nisnAvailable ? (
                      <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        NISN valid dan tersedia untuk didaftarkan.
                      </p>
                    ) : nisnError ? (
                      <p className={`text-[11px] font-semibold flex items-start gap-1 ${
                        nisn.length === 10 ? "text-rose-600" : "text-amber-600"
                      }`}>
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{nisnError}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        Pastikan tepat 10 digit sesuai nomor di rapor atau kartu NISN resmi.
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Nama Lengkap Siswa */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Nama Lengkap Siswa</label>
                  <Input
                    type="text"
                    placeholder="Contoh: Muhammad Budi Pratama"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="h-11 text-xs"
                    required
                  />
                  {nama.trim().length > 0 && nama.trim().length < 3 ? (
                    <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Nama lengkap harus minimal 3 karakter.
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Gunakan nama lengkap asli sesuai arsip sekolah.</p>
                  )}
                </div>

                {/* Tombol Kirim Pengajuan dengan status Disabled bila tidak valid */}
                <Button
                  type="submit"
                  className="w-full h-11 mt-2 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-98"
                  disabled={
                    submitting ||
                    kelasList.length === 0 ||
                    !kelasId ||
                    nisn.length !== 10 ||
                    !nisnAvailable ||
                    nisnChecking ||
                    nama.trim().length < 3
                  }
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengirim Permintaan Aktivasi...
                    </span>
                  ) : (
                    "Kirim Permintaan Aktivasi"
                  )}
                </Button>
              </form>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-4">
          <Button variant="ghost" size="sm" onClick={() => logout()} className="text-xs text-muted-foreground">
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Ganti Akun Google
          </Button>

          <span className="text-[11px] text-muted-foreground">SMPN 3 Ketapang</span>
        </CardFooter>
      </Card>
    </div>
  )
}
