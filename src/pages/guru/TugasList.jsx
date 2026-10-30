import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useToast } from "@/context/ToastContext"
import { getTugasList, deleteTugas, getPengumpulanByTugas } from "@/services/tugas"
import { getMuridList } from "@/services/murid"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import {
  ClipboardList,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
} from "lucide-react"

export function TugasList() {
  const { toast, confirmAction } = useToast()
  const [tugasList, setTugasList] = useState([])
  const [pengumpulanMap, setPengumpulanMap] = useState({})
  const [totalMurid, setTotalMurid] = useState(0)
  const [loading, setLoading] = useState(true)

  async function loadData() {
    try {
      const [tList, mList] = await Promise.all([
        getTugasList(true),
        getMuridList(),
      ])
      setTugasList(tList)
      setTotalMurid(mList.length)

      // Ambil data pengumpulan per tugas
      const pMap = {}
      await Promise.all(
        tList.map(async (t) => {
          const subs = await getPengumpulanByTugas(t.id)
          const gradedCount = subs.filter((s) => s.status === "dinilai").length
          pMap[t.id] = {
            totalSubmitted: subs.length,
            totalGraded: gradedCount,
          }
        })
      )
      setPengumpulanMap(pMap)
    } catch (err) {
      console.error("Gagal memuat daftar tugas:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    loadData()
  }, [])

  function handleDelete(id, judul) {
    confirmAction({
      title: "Hapus Penugasan Siswa",
      message: `Hapus tugas "${judul}"? Seluruh berkas tautan tugas dan rekaman nilai siswa untuk tugas ini juga akan dihapus permanen.`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteTugas(id)
          toast.success("Tugas Dihapus", `Penugasan "${judul}" berhasil dihapus.`)
          await loadData()
        } catch (err) {
          toast.error("Gagal Menghapus", err.message || "Gagal menghapus tugas.")
        }
      },
    })
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-5 sm:p-7 shadow-lg shadow-blue-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold">
            <ClipboardList className="w-3.5 h-3.5 text-blue-200" />
            <span>Manajemen Penugasan Siswa</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Penugasan & Evaluasi Mandiri
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
            Buat tugas literasi, kumpulkan karya siswa via link Google Drive, dan berikan penilaian serta catatan umpan balik.
          </p>
        </div>

        <Button
          asChild
          className="bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-xs h-10 px-4 rounded-xl shadow-md shrink-0 gap-1.5"
        >
          <Link to="/guru/tugas/baru">
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Buat Tugas Baru</span>
          </Link>
        </Button>
      </div>

      {/* Daftar Kartu Tugas */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">
            Memuat daftar penugasan...
          </div>
        ) : tugasList.length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-slate-200 p-8 text-center bg-white space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Belum Ada Tugas yang Dibuat</h3>
              <p className="text-xs text-slate-500 mt-1">
                Mulai buat penugasan pertama untuk melatih keterampilan menulis atau karya siswa.
              </p>
            </div>
            <Button asChild size="sm" className="rounded-xl text-xs font-bold gap-1.5">
              <Link to="/guru/tugas/baru">
                <Plus className="w-4 h-4" />
                <span>Buat Tugas Baru</span>
              </Link>
            </Button>
          </Card>
        ) : (
          tugasList.map((tugas) => {
            const pInfo = pengumpulanMap[tugas.id] || { totalSubmitted: 0, totalGraded: 0 }
            const isDeadlinePassed = tugas.deadline ? new Date(tugas.deadline) < new Date() : false

            return (
              <Card
                key={tugas.id}
                className="rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md transition-all overflow-hidden bg-white"
              >
                <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${tugas.status === "terbit"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                    >
                      {tugas.status === "terbit" ? "Terbit (Aktif)" : "Draf"}
                    </span>

                    {/* Badge Kelas Spesifik atau Tingkat Sasaran */}
                    {tugas.kelasNamaList && tugas.kelasNamaList.length > 0 ? (
                      tugas.kelasNamaList.map((nama) => (
                        <Badge
                          key={nama}
                          variant="outline"
                          className="text-[10px] bg-blue-50/70 text-blue-700 border-blue-200 font-bold"
                        >
                          Kelas {nama}
                        </Badge>
                      ))
                    ) : (
                      tugas.tingkat?.map((ting) => (
                        <Badge
                          key={ting}
                          variant="outline"
                          className="text-[10px] bg-blue-50/70 text-blue-700 border-blue-200 font-bold"
                        >
                          Kelas {ting}
                        </Badge>
                      ))
                    )}
                  </div>

                  {/* Deadline Indicator */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500 font-medium">Batas Waktu:</span>
                    <span
                      className={`font-bold ${isDeadlinePassed ? "text-rose-600" : "text-slate-800"
                        }`}
                    >
                      {tugas.deadline ? formatDate(tugas.deadline) : "Tidak ada batas"}
                    </span>
                    {isDeadlinePassed && (
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] px-1.5 py-0">
                        Lewat
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                      {tugas.judul}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {tugas.deskripsi || "Tidak ada deskripsi penugasan."}
                    </p>
                  </div>

                  {/* Statistik Pengumpulan & Tombol Aksi */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-xl font-bold border border-blue-100">
                        <Users className="w-3.5 h-3.5" />
                        <span>{pInfo.totalSubmitted} Siswa Mengumpulkan</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl font-bold border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{pInfo.totalGraded} Dinilai</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tugas.id, tugas.judul)}
                        className="text-slate-400 hover:text-rose-600 rounded-xl h-9 px-2.5"
                        title="Hapus Tugas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-xl text-xs font-bold h-9 px-3 border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        <Link to={`/guru/tugas/${tugas.id}/edit`}>
                          <Edit className="w-3.5 h-3.5 mr-1.5" />
                          <span>Edit</span>
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        asChild
                        className="rounded-xl text-xs font-bold h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                      >
                        <Link to={`/guru/tugas/${tugas.id}/nilai`}>
                          <span>Nilai & Evaluasi</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

