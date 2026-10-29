import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getKelasList } from "@/services/kelas"
import { getMuridList } from "@/services/murid"
import { getMateriList } from "@/services/materi"
import { getKuisList } from "@/services/kuis"
import { getKlaimList } from "@/services/klaim"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { DashboardGuruSkeleton } from "@/components/ui/loading-skeletons"
import {
  GraduationCap,
  Users,
  BookOpen,
  FileQuestion,
  Inbox,
  BarChart3,
  User,
  School,
  ChevronRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Eye,
  Feather,
} from "lucide-react"

export function Dashboard() {
  const { profileData } = useAuth()
  const [stats, setStats] = useState({
    kelasCount: 0,
    muridCount: 0,
    materiTerbit: 0,
    materiDraft: 0,
    kuisCount: 0,
    permintaanCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })

    async function loadStats() {
      try {
        const [kelas, murid, materi, kuis, klaim] = await Promise.all([
          getKelasList(),
          getMuridList(),
          getMateriList(true),
          getKuisList(true),
          getKlaimList(),
        ])

        const terbit = materi.filter((m) => m.status === "terbit").length
        const draft = materi.filter((m) => m.status === "draft").length

        setStats({
          kelasCount: kelas.length,
          muridCount: murid.length,
          materiTerbit: terbit,
          materiDraft: draft,
          kuisCount: kuis.length,
          permintaanCount: klaim.length,
        })
      } catch (err) {
        console.error("Gagal memuat ringkasan dashboard:", err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  if (loading) {
    return <DashboardGuruSkeleton />
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Profil Pengawas & Monitoring Guru */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-5 sm:p-7 shadow-lg shadow-blue-500/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold">
            <Activity className="w-3.5 h-3.5" />
            <span>Panel Monitoring & Evaluasi Belajar</span>
          </div>
          <Link
            to="/guru/profil"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
            title="Pengaturan Profil Pengajar"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profil</span>
          </Link>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
            Pusat Pantau Belajar &bull; {profileData?.nama || "Ibu Ernawaty"}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 font-normal leading-relaxed">
            Mata Pelajaran: <b>{profileData?.mapel || "Bahasa Inggris"}</b> &bull; Pantau progres literasi, evaluasi hasil kuis, dan data kehadiran siswa secara berkala.
          </p>
        </div>

        {/* Notifikasi Cepat Permintaan Aktivasi jika ada */}
        {stats.permintaanCount > 0 && (
          <div className="pt-2">
            <Link
              to="/guru/permintaan"
              className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-2xl bg-white text-blue-700 font-bold text-xs shadow-md hover:bg-blue-50 transition-all active:scale-98"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <Inbox className="w-4 h-4 text-blue-600" />
                <span>{stats.permintaanCount} Akun Siswa Menunggu Verifikasi</span>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-600" />
            </Link>
          </div>
        )}
      </div>

      {/* 2. Indikator Statistik Pemantauan (2 Kolom Mobile, 4 Kolom Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Murid Terdaftar */}
        <Link
          to="/guru/murid"
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Siswa Terdaftar
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : stats.muridCount}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Siswa terdata aktif</p>
          </div>
        </Link>

        {/* Rombel / Kelas */}
        <Link
          to="/guru/kelas"
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-md transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Kelas Terdaftar
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : stats.kelasCount}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Kelas Fase D</p>
          </div>
        </Link>

        {/* Materi Ajar Terpantau */}
        <Link
          to="/guru/materi"
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Modul Ajar
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : `${stats.materiTerbit}`}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {stats.materiDraft > 0 ? `${stats.materiDraft} draf belum terbit` : "Modul Terbit"}
            </p>
          </div>
        </Link>

        {/* Kuis Formatif Terdaftar */}
        <Link
          to="/guru/kuis"
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-amber-300 hover:shadow-md transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Kuis Formatif
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
              <FileQuestion className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : stats.kuisCount}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Latihan aktif dipantau</p>
          </div>
        </Link>
      </div>

      {/* 3. Panel Navigasi Monitoring & Evaluasi Guru */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-800">
            Pusat Monitoring & Laporan
          </h2>
          <span className="text-[11px] text-slate-400">Pilih modul pantau</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Monitoring 1: Progres Membaca Materi */}
          <Link
            to="/guru/progres"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-purple-300 transition-all flex items-center justify-between group active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-extrabold text-sm text-slate-900">
                  Pantau Progres Membaca Materi
                </div>
                <div className="text-xs text-slate-500">
                  Lihat rekap siswa mana saja yang sudah membaca tiap bab materi
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </Link>

          {/* Monitoring 2: Rekap Skor & Hasil Kuis */}
          <Link
            to="/guru/kuis"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex items-center justify-between group active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-extrabold text-sm text-slate-900">
                  Evaluasi Nilai & Kuis Latihan
                </div>
                <div className="text-xs text-slate-500">
                  Periksa distribusi skor siswa, lembar jawaban, dan ekspor berkas CSV
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
          </Link>

          {/* Monitoring 3: Verifikasi Aktivasi Akun Siswa */}
          <Link
            to="/guru/permintaan"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-rose-300 transition-all flex items-center justify-between group active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Inbox className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-extrabold text-sm text-slate-900">
                  Verifikasi Aktivasi Siswa
                </div>
                <div className="text-xs text-slate-500">
                  {stats.permintaanCount > 0
                    ? `${stats.permintaanCount} permohonan menunggu persetujuan`
                    : "Semua akun siswa telah terverifikasi"}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
          </Link>

          {/* Monitoring 4: Data Induk & Keanggotaan Kelas */}
          <Link
            to="/guru/murid"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex items-center justify-between group active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-extrabold text-sm text-slate-900">
                  Pantau Kehadiran & Siswa per Kelas
                </div>
                <div className="text-xs text-slate-500">
                  Daftar NISN, email siswa aktif, dan penempatan kelas
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </Link>

          {/* Monitoring 5: Pojok Kreasi & Literasi Murid */}
          <Link
            to="/guru/mading"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex items-center justify-between group active:scale-98 md:col-span-2"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Feather className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-extrabold text-sm text-slate-900">
                  Monitoring Pojok Kreasi Siswa
                </div>
                <div className="text-xs text-slate-500">
                  Periksa kiriman pantun, puisi, cerpen siswa, dan berikan apresiasi
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  )
}
