import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { getKelasList } from "@/services/kelas"
import {
  createSesiMeet,
  subscribeAllSesiMeetGuru,
  updateStatusSesiMeet,
  deleteSesiMeet,
} from "@/services/meet"
import { AgoraMeetRoom } from "@/components/meet/AgoraMeetRoom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Video,
  Plus,
  Calendar,
  Clock,
  Play,
  Square,
  Trash2,
  Users,
  Sparkles,
  ExternalLink,
} from "lucide-react"

export function GuruMeet() {
  const { currentUser, profileData } = useAuth()
  const [sesiList, setSesiList] = useState([])
  const [kelasList, setKelasList] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [activeMeetSession, setActiveMeetSession] = useState(null)

  // Form State
  const [judul, setJudul] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [selectedKelasId, setSelectedKelasId] = useState("")
  const [waktuMulai, setWaktuMulai] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadKelas() {
      try {
        const kList = await getKelasList()
        setKelasList(kList)
        if (kList.length > 0) {
          setSelectedKelasId(kList[0].id)
        }
      } catch (e) {
        console.error("Gagal load kelas:", e)
      }
    }
    loadKelas()

    const unsub = subscribeAllSesiMeetGuru((data) => {
      setSesiList(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  async function handleBuatSesi(e) {
    e.preventDefault()
    if (!judul.trim() || !selectedKelasId || submitting) return

    setSubmitting(true)
    try {
      const targetKelas = kelasList.find((k) => k.id === selectedKelasId)
      await createSesiMeet({
        judul,
        deskripsi,
        kelasId: selectedKelasId,
        kelasNama: targetKelas?.nama || "Semua Kelas",
        tingkat: targetKelas?.tingkat || null,
        waktuMulai: waktuMulai || new Date().toISOString(),
        guruUid: currentUser.uid,
        guruNama: profileData?.nama || "Ibu Guru",
      })

      // Reset form
      setJudul("")
      setDeskripsi("")
      setWaktuMulai("")
      setIsCreating(false)
    } catch (err) {
      console.error("Gagal membuat sesi meet:", err)
      alert(err.message || "Gagal membuat sesi meet.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMulaiSesi(sesi) {
    try {
      await updateStatusSesiMeet(sesi.id, "berlangsung")
      setActiveMeetSession(sesi)
    } catch (err) {
      console.error("Gagal memulai sesi:", err)
    }
  }

  async function handleAkhiriSesi(sesiId) {
    if (window.confirm("Akhiri sesi video meet ini sekarang?")) {
      try {
        await updateStatusSesiMeet(sesiId, "selesai")
        if (activeMeetSession?.id === sesiId) {
          setActiveMeetSession(null)
        }
      } catch (err) {
        console.error("Gagal mengakhiri sesi:", err)
      }
    }
  }

  async function handleHapus(sesiId) {
    if (window.confirm("Hapus jadwal sesi meet ini?")) {
      try {
        await deleteSesiMeet(sesiId)
      } catch (err) {
        console.error("Gagal menghapus:", err)
      }
    }
  }

  function formatWaktuDisplay(timestamp) {
    if (!timestamp) return "-"
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-600" />
            <span>Sesi Virtual Meet & Tatap Muka</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Jadwalkan dan mulai sesi video conference interaktif dengan siswa per kelas menggunakan Agora RTC.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold gap-1.5 h-10 px-4 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? "Tutup Form" : "Jadwalkan Sesi Baru"}</span>
        </Button>
      </div>

      {/* Form Buat Sesi Baru */}
      {isCreating && (
        <form
          onSubmit={handleBuatSesi}
          className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200/90 shadow-sm space-y-4 animate-in fade-in"
        >
          <div className="font-extrabold text-sm text-slate-900 border-b pb-2">
            Form Pembuatan Sesi Video Meet
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Judul Sesi Meet *</label>
              <Input
                placeholder="Contoh: Pembahasan Bab 2 & Tanya Jawab"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                required
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Pilih Kelas Sasaran *</label>
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} (Tingkat {k.tingkat || "-"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Waktu Pelaksanaan *</label>
              <Input
                type="datetime-local"
                value={waktuMulai}
                onChange={(e) => setWaktuMulai(e.target.value)}
                required
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Deskripsi / Catatan Tambahan</label>
              <Input
                placeholder="Contoh: Harap siapkan buku catatan materi rekon"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreating(false)}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-9 px-5"
            >
              {submitting ? "Membuat..." : "Simpan Jadwal"}
            </Button>
          </div>
        </form>
      )}

      {/* Daftar Sesi Meet */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Daftar Sesi Tatap Muka Terjadwal & Selesai
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">
            Memuat daftar sesi video meet...
          </div>
        ) : sesiList.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 space-y-2">
            <Video className="w-8 h-8 mx-auto text-slate-300 opacity-60" />
            <p className="text-xs font-semibold text-slate-600">Belum Ada Sesi Video Meet</p>
            <p className="text-[11px]">
              Klik tombol "Jadwalkan Sesi Baru" untuk membuat ruang video conference bagi murid.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {sesiList.map((sesi) => {
              const isLive = sesi.status === "berlangsung"
              const isDone = sesi.status === "selesai"

              return (
                <div
                  key={sesi.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all space-y-3.5 flex flex-col justify-between ${
                    isLive
                      ? "bg-emerald-50/60 border-emerald-300 shadow-sm ring-2 ring-emerald-500/20"
                      : isDone
                      ? "bg-slate-50/80 border-slate-200 opacity-80"
                      : "bg-white border-slate-200/90 shadow-2xs hover:border-blue-300"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border-none ${
                          isLive
                            ? "bg-emerald-600 text-white animate-pulse"
                            : isDone
                            ? "bg-slate-200 text-slate-600"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {isLive ? "LIVE BERLANGSUNG" : isDone ? "SELESAI" : "TERJADWAL"}
                      </Badge>

                      <span className="text-[11px] font-bold text-slate-500">
                        {sesi.kelasNama}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-1">
                      {sesi.judul}
                    </h3>

                    {sesi.deskripsi && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {sesi.deskripsi}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatWaktuDisplay(sesi.waktuMulai)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isLive ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setActiveMeetSession(sesi)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-8 px-3 gap-1 shadow-xs"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Buka Ruang Meet</span>
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleAkhiriSesi(sesi.id)}
                            className="text-xs rounded-xl h-8 px-2.5"
                            title="Akhiri Sesi"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : !isDone ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleMulaiSesi(sesi)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-8 px-3 gap-1 shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Mulai Sesi Sekarang</span>
                        </Button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          Sesi ini telah selesai
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleHapus(sesi.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                      title="Hapus sesi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Layar Video Meet Agora Fullscreen jika aktif */}
      {activeMeetSession && (
        <AgoraMeetRoom
          channelName={activeMeetSession.channelName}
          judulSesi={activeMeetSession.judul}
          userNama={profileData?.nama || "Guru Pengajar"}
          isGuru={true}
          onLeave={() => setActiveMeetSession(null)}
        />
      )}
    </div>
  )
}
