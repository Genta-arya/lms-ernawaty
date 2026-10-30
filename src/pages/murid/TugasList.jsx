import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { getTugasList, getPengumpulanByMurid } from "@/services/tugas"
import { normalizeTingkatRomawi, formatDate } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Award,
  Search,
  BookOpen,
  ArrowLeft,
} from "lucide-react"

export function TugasList() {
  const { currentUser, profileData } = useAuth()
  const [tugasList, setTugasList] = useState([])
  const [submissionMap, setSubmissionMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState("semua") // "semua" | "belum" | "sudah" | "dinilai"

  const studentTingkat = normalizeTingkatRomawi(profileData?.tingkat || profileData?.kelasNama)
  const studentKelasId = profileData?.kelasId || null

  async function loadData() {
    if (!currentUser) return
    try {
      const [tList, mySubs] = await Promise.all([
        getTugasList(false, studentTingkat, studentKelasId),
        getPengumpulanByMurid(currentUser.uid),
      ])

      setTugasList(tList)

      const sMap = {}
      mySubs.forEach((s) => {
        sMap[s.tugasId] = s
      })
      setSubmissionMap(sMap)
    } catch (err) {
      console.error("Gagal memuat tugas siswa:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    loadData()
  }, [currentUser, studentTingkat, studentKelasId])

  const filteredTugas = tugasList.filter((t) => {
    const sub = submissionMap[t.id]
    const hasSubmitted = !!sub
    const isGraded = sub?.status === "dinilai" && sub?.nilai !== undefined

    if (filterTab === "belum" && hasSubmitted) return false
    if (filterTab === "sudah" && (!hasSubmitted || isGraded)) return false
    if (filterTab === "dinilai" && !isGraded) return false
    return true
  })

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Tombol Navigasi Kembali ke Beranda */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100"
        >
          <Link to="/murid">
            <ArrowLeft className="w-4 h-4 text-blue-600" />
            <span className="text-xs sm:text-sm font-bold">Kembali</span>
          </Link>
        </Button>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-5 sm:p-7 shadow-lg shadow-blue-500/10 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold">
          <ClipboardList className="w-3.5 h-3.5 text-blue-200" />
          <span>Penugasan Mandiri & Proyek Siswa</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
          Daftar Penugasan Siswa
        </h1>
        <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
          Kerjakan tugas dari Ibu Guru, unggah dokumen karyamu ke Google Drive, lalu salin tautannya ke sistem untuk mendapatkan evaluasi dan nilai.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "semua", label: "Semua Tugas", count: tugasList.length },
          {
            id: "belum",
            label: "Belum Dikerjakan",
            count: tugasList.filter((t) => !submissionMap[t.id]).length,
          },
          {
            id: "sudah",
            label: "Menunggu Nilai",
            count: tugasList.filter((t) => submissionMap[t.id] && submissionMap[t.id].status !== "dinilai").length,
          },
          {
            id: "dinilai",
            label: "Sudah Dinilai",
            count: tugasList.filter((t) => submissionMap[t.id]?.status === "dinilai").length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
              filterTab === tab.id
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* List Kartu Tugas */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">
            Memuat penugasan kelas...
          </div>
        ) : filteredTugas.length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-slate-200 p-8 text-center bg-white space-y-2">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Tidak Ada Tugas Pada Kategori Ini</h3>
            <p className="text-xs text-slate-400">
              {filterTab === "semua"
                ? "Belum ada penugasan aktif dari pengajar untuk kelasmu saat ini."
                : "Coba ganti filter tab di atas untuk melihat tugas lainnya."}
            </p>
          </Card>
        ) : (
          filteredTugas.map((tugas) => {
            const sub = submissionMap[tugas.id]
            const isSubmitted = !!sub
            const isGraded = sub?.status === "dinilai" && sub?.nilai !== undefined
            const isDeadlinePassed = tugas.deadline ? new Date(tugas.deadline) < new Date() : false

            return (
              <Card
                key={tugas.id}
                className="rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md transition-all overflow-hidden bg-white"
              >
                <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Badge Status Murid */}
                    {isGraded ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-2.5 py-0.5">
                        Nilai: {sub.nilai} / 100
                      </Badge>
                    ) : isSubmitted ? (
                      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5">
                        Sudah Dikumpulkan
                      </Badge>
                    ) : isDeadlinePassed ? (
                      <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5">
                        Tenggat Waktu Lewat
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5">
                        Belum Dikerjakan
                      </Badge>
                    )}

                    {tugas.tingkat?.map((ting) => (
                      <span
                        key={ting}
                        className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"
                      >
                        Kelas {ting}
                      </span>
                    ))}
                  </div>

                  {/* Deadline Info */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">Tenggat:</span>
                    <span
                      className={`font-bold ${
                        isDeadlinePassed && !isSubmitted ? "text-rose-600" : "text-slate-700"
                      }`}
                    >
                      {tugas.deadline ? formatDate(tugas.deadline) : "Fleksibel"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                      {tugas.judul}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {tugas.deskripsi}
                    </p>
                  </div>

                  {/* Catatan Feedback Jika Sudah Dinilai */}
                  {isGraded && sub.catatanGuru && (
                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Catatan Evaluasi Ibu Guru:</span>
                      </div>
                      <p className="italic leading-relaxed">{sub.catatanGuru}</p>
                    </div>
                  )}

                  {/* Footer Tombol Aksi */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-[11px] text-slate-400">
                      {isSubmitted ? (
                        <span className="text-blue-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Terkirim: {formatDate(sub.submittedAt)}</span>
                        </span>
                      ) : (
                        <span>Kumpulkan via Google Drive / Cloud</span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      asChild
                      className={`rounded-xl text-xs font-bold h-9 px-4 shadow-xs gap-1.5 ${
                        isGraded
                          ? "bg-slate-900 hover:bg-slate-800 text-white"
                          : isSubmitted
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      <Link to={`/murid/tugas/${tugas.id}`}>
                        <span>
                          {isGraded
                            ? "Lihat Hasil & Ulasan"
                            : isDeadlinePassed
                            ? "Lihat Detail"
                            : isSubmitted
                            ? "Perbarui Tautan"
                            : "Kerjakan Tugas"}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
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

