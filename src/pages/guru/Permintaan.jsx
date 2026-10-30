import React, { useState, useEffect } from "react"
import { getKlaimList, approveKlaim, rejectKlaim } from "@/services/klaim"
import { useToast } from "@/context/ToastContext"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PermintaanSkeleton } from "@/components/ui/loading-skeletons"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Inbox,
  CheckCircle,
  XCircle,
  ShieldCheck,
  GraduationCap,
  UserPlus,
  Mail,
  Fingerprint,
} from "lucide-react"

export function Permintaan() {
  const { toast } = useToast()
  const [klaimList, setKlaimList] = useState([])
  const [loading, setLoading] = useState(true)

  // Dialog Tolak
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedKlaim, setSelectedKlaim] = useState(null)
  const [alasanTolak, setAlasanTolak] = useState("")
  const [processing, setProcessing] = useState(false)

  async function loadData() {
    try {
      const data = await getKlaimList()
      setKlaimList(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    loadData()
  }, [])

  async function handleApprove(claim) {
    if (claim.isNisnTerhubungAkunLain) {
      toast.warning(
        "NISN Sudah Digunakan",
        `NISN ${claim.nisn} sudah aktif digunakan akun lain. Cabut akun lama terlebih dahulu atau tolak permohonan ini.`
      )
      return
    }

    setProcessing(true)
    try {
      await approveKlaim(claim)
      await loadData()
      toast.success(
        "Aktivasi Disetujui",
        `Permintaan aktivasi untuk ${claim.nama} berhasil disetujui! Siswa telah dimasukkan ke daftar murid.`
      )
    } catch (err) {
      toast.error("Gagal Menyetujui", err.message || "Gagal menyetujui klaim.")
    } finally {
      setProcessing(false)
    }
  }

  function handleOpenReject(claim) {
    setSelectedKlaim(claim)
    setAlasanTolak("Data NISN atau nama tidak sesuai dengan arsip sekolah.")
    setRejectDialogOpen(true)
  }

  async function handleConfirmReject() {
    if (!selectedKlaim) return
    setProcessing(true)
    try {
      await rejectKlaim(selectedKlaim.uid, alasanTolak)
      setRejectDialogOpen(false)
      await loadData()
      toast.info("Permintaan Ditolak", `Permintaan dari ${selectedKlaim.nama} telah ditolak.`)
    } catch (err) {
      toast.error("Gagal Menolak", err.message || "Gagal menolak klaim.")
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <PermintaanSkeleton />
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Permintaan Aktivasi Akun
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Setujui permohonan akun siswa baru agar murid dapat langsung masuk ke kelas dan kuis.
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-bold bg-white px-3 py-1 border-slate-200">
          {klaimList.length} Menunggu
        </Badge>
      </div>

      {/* TAMPILAN MOBILE: KARTU LIST TOUCH-FRIENDLY */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 animate-pulse">
            Memuat permohonan murid...
          </div>
        ) : klaimList.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-slate-700 text-sm">Tidak Ada Permintaan</div>
            <div className="text-xs text-slate-400">Semua permohonan siswa telah diverifikasi.</div>
          </div>
        ) : (
          klaimList.map((claim) => {
            const muridFound = !!claim.muridData

            return (
              <div
                key={claim.uid}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3"
              >
                {/* Header Card Siswa */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                      {claim.nama}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{claim.email}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold bg-blue-50 text-blue-700 shrink-0">
                    {claim.kelasNama || "Kelas Belum Dipilih"}
                  </Badge>
                </div>

                {/* Info NISN & Status Verifikasi */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                      NISN:
                    </span>
                    <span className="font-mono font-bold text-slate-800">{claim.nisn}</span>
                  </div>

                  <div className="pt-1 border-t border-slate-200/60">
                    {muridFound ? (
                      <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        NISN Terdaftar di Data Sekolah
                      </span>
                    ) : (
                      <span className="text-blue-700 font-semibold text-[11px] flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" />
                        Siswa Baru (Otomatis Didaftarkan)
                      </span>
                    )}
                  </div>
                </div>

                {/* Tombol Aksi Mobile Lebar */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={processing}
                    onClick={() => handleApprove(claim)}
                    className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Setujui
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processing}
                    onClick={() => handleOpenReject(claim)}
                    className="h-10 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200 rounded-xl"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Tolak
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* TAMPILAN DESKTOP: TABEL LEBAR */}
      <Card className="hidden md:block shadow-xs border-slate-200 rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-xs text-slate-600">Email Google Siswa</TableHead>
                <TableHead className="font-bold text-xs text-slate-600">NISN</TableHead>
                <TableHead className="font-bold text-xs text-slate-600">Nama & Kelas</TableHead>
                <TableHead className="font-bold text-xs text-slate-600">Status Verifikasi</TableHead>
                <TableHead className="text-right font-bold text-xs text-slate-600">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                    Memuat data permintaan...
                  </TableCell>
                </TableRow>
              ) : klaimList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-400 text-xs">
                    <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Tidak ada permohonan aktivasi yang menunggu saat ini.
                  </TableCell>
                </TableRow>
              ) : (
                klaimList.map((claim) => {
                  const muridFound = !!claim.muridData

                  return (
                    <TableRow key={claim.uid}>
                      <TableCell className="text-xs font-semibold text-slate-900">
                        {claim.email}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-700">{claim.nisn}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-slate-900 block">{claim.nama}</span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                            <GraduationCap className="w-3 h-3" />
                            {claim.kelasNama || "Belum Dipilih"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {muridFound ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              NISN Cocok di Database
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-blue-600 font-semibold">
                              <UserPlus className="w-3.5 h-3.5" />
                              Siswa Baru (Akan didaftarkan)
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={processing}
                            onClick={() => handleApprove(claim)}
                            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processing}
                            onClick={() => handleOpenReject(claim)}
                            className="h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50 border-rose-200 rounded-lg gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Tolak
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Tolak Permintaan */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Tolak Permintaan Aktivasi
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Berikan catatan penolakan untuk murid <b>{selectedKlaim?.nama}</b> ({selectedKlaim?.email}):
            </p>
            <Textarea
              rows={3}
              value={alasanTolak}
              onChange={(e) => setAlasanTolak(e.target.value)}
              placeholder="Jelaskan alasan penolakan..."
              className="rounded-xl text-xs"
            />
          </div>

          <DialogFooter className="flex-row gap-2 justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmReject}
              disabled={processing}
              className="rounded-xl text-xs font-bold"
            >
              {processing ? "Memproses..." : "Konfirmasi Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
