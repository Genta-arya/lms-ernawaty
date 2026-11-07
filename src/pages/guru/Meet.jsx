import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "@/context/AuthContext"
import { getKelasList } from "@/services/kelas"
import {
  createSesiMeet,
  subscribeAllSesiMeetGuru,
  updateStatusSesiMeet,
  deleteSesiMeet,
} from "@/services/meet"
import { AgoraMeetRoom } from "@/components/meet/AgoraMeetRoom"
import { PreMeetLobbyModal } from "@/components/meet/PreMeetLobbyModal"
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
  ShieldAlert,
  Monitor,
  Laptop,
  Info,
} from "lucide-react"

export function GuruMeet() {
  const { currentUser, profileData } = useAuth()
  const [sesiList, setSesiList] = useState([])
  const [kelasList, setKelasList] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [activeMeetSession, setActiveMeetSession] = useState(null)
  const [lobbyMeetSession, setLobbyMeetSession] = useState(null)
  const [meetInitialSettings, setMeetInitialSettings] = useState(null)
  const [modalConfirmAction, setModalConfirmAction] = useState(null) // { type: 'akhiri' | 'hapus', sesi: Object }

  // Form State
  const [judul, setJudul] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [selectedKelasId, setSelectedKelasId] = useState("")
  const [waktuMulai, setWaktuMulai] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Cek konflik: sesi aktif di kelas yang sama pada hari yang sama
  const targetKelas = kelasList.find((k) => k.id === selectedKelasId)
  const targetDate = waktuMulai ? new Date(waktuMulai) : new Date()
  const conflictingActiveSession = sesiList.find((s) => {
    if (s.status !== "berlangsung") return false
    const matchClass =
      s.kelasId === selectedKelasId || s.kelasId === "semua" || selectedKelasId === "semua"
    if (!matchClass) return false
    const sDate = s.waktuMulai?.toDate ? s.waktuMulai.toDate() : new Date(s.waktuMulai || s.createdAt)
    return (
      sDate.getFullYear() === targetDate.getFullYear() &&
      sDate.getMonth() === targetDate.getMonth() &&
      sDate.getDate() === targetDate.getDate()
    )
  })

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

    if (conflictingActiveSession) {
      alert(
        `Tidak dapat membuat sesi baru: Masih ada sesi tatap muka yang aktif (LIVE BERLANGSUNG) untuk kelas ${targetKelas?.nama || "ini"
        } pada hari yang sama ("${conflictingActiveSession.judul}"). Harap selesaikan atau akhiri sesi tersebut terlebih dahulu.`
      )
      return
    }

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
    const alreadyLive = sesiList.find((s) => {
      if (s.id === sesi.id || s.status !== "berlangsung") return false
      const matchClass =
        s.kelasId === sesi.kelasId || s.kelasId === "semua" || sesi.kelasId === "semua"
      if (!matchClass) return false
      const sDate = s.waktuMulai?.toDate ? s.waktuMulai.toDate() : new Date(s.waktuMulai || s.createdAt)
      const tDate = sesi.waktuMulai?.toDate ? sesi.waktuMulai.toDate() : new Date(sesi.waktuMulai || Date.now())
      return (
        sDate.getFullYear() === tDate.getFullYear() &&
        sDate.getMonth() === tDate.getMonth() &&
        sDate.getDate() === tDate.getDate()
      )
    })
    if (alreadyLive) {
      alert(
        `Tidak dapat memulai sesi. Masih ada sesi tatap muka lain yang sedang aktif di kelas ${sesi.kelasNama}: "${alreadyLive.judul}". Mohon akhiri sesi tersebut terlebih dahulu.`
      )
      return
    }

    try {
      await updateStatusSesiMeet(sesi.id, "berlangsung")
      // Arahkan ke lobby preview perangkat terlebih dahulu agar guru siap dan audio/video terkonfigurasi
      setLobbyMeetSession(sesi)
    } catch (err) {
      console.error("Gagal memulai sesi:", err)
      // Fallback tetap buka lobby jika status update gagal
      setLobbyMeetSession(sesi)
    }
  }

  async function executeConfirmAction() {
    if (!modalConfirmAction) return
    const { type, sesi } = modalConfirmAction
    try {
      if (type === "akhiri") {
        await updateStatusSesiMeet(sesi.id, "selesai")
        if (activeMeetSession?.id === sesi.id) {
          setActiveMeetSession(null)
        }
      } else if (type === "hapus") {
        await deleteSesiMeet(sesi.id)
      }
    } catch (err) {
      console.error(`Gagal melakukan aksi ${type}:`, err)
    } finally {
      setModalConfirmAction(null)
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
            Jadwalkan dan mulai sesi video conference interaktif.
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

          {/* Banner Peringatan jika Ada Sesi Aktif di Kelas & Hari yang Sama */}
          {conflictingActiveSession && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="font-bold text-amber-950">
                  Perhatian: Masih Ada Sesi Aktif di Hari yang Sama
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Kelas <b>{targetKelas?.nama || "terpilih"}</b> sudah memiliki sesi tatap muka yang berstatus{" "}
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded">LIVE BERLANGSUNG</span> yaitu{" "}
                  <b>"{conflictingActiveSession.judul}"</b>. Anda hanya dapat memiliki 1 sesi aktif per kelas di hari yang sama.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAkhiriSesi(conflictingActiveSession.id)}
                    className="h-7 text-[11px] font-bold border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg gap-1"
                  >
                    <Square className="w-3 h-3 text-rose-600 fill-rose-600" />
                    <span>Akhiri Sesi "{conflictingActiveSession.judul}" Sekarang</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

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
              disabled={submitting || !!conflictingActiveSession}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-9 px-5 disabled:opacity-50"
            >
              {submitting ? "Membuat..." : "Simpan Jadwal"}
            </Button>
          </div>
        </form>
      )}

      {/* Notice Banner: Panduan & Edukasi Berbagi Layar (Screen Sharing) */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-2xl bg-blue-600 text-white shrink-0 mt-0.5 shadow-sm">
            <Laptop className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>Tips Presentasi & Berbagi Layar (Screen Share)</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700">
                Penting
              </span>
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Untuk melakukan <b>presentasi layar (share screen materi, PDF, atau slide)</b>, disarankan membuka LMS menggunakan <b>Laptop / PC</b> di Google Chrome. Browser di HP (Android & iOS) membatasi izin perekaman layar website demi keamanan privasi ponsel.
            </p>
          </div>
        </div>
      </div>

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
                  className={`p-4 sm:p-5 rounded-3xl border transition-all space-y-3.5 flex flex-col justify-between ${isLive
                      ? "bg-emerald-50/60 border-emerald-300 shadow-sm ring-2 ring-emerald-500/20"
                      : isDone
                        ? "bg-slate-50/80 border-slate-200 opacity-80"
                        : "bg-white border-slate-200/90 shadow-2xs hover:border-blue-300"
                    }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border-none ${isLive
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
                            onClick={() => setLobbyMeetSession(sesi)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-8 px-3 gap-1 shadow-xs"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Buka Ruang Meet</span>
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setModalConfirmAction({ type: "akhiri", sesi })}
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
                      onClick={() => setModalConfirmAction({ type: "hapus", sesi })}
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

      {/* Layar Preview Pra-Meet Sebelum Masuk */}
      {lobbyMeetSession && (
        <PreMeetLobbyModal
          judulSesi={lobbyMeetSession.judul}
          userNama={profileData?.nama || "Guru Pengajar"}
          isGuru={true}
          onJoin={(settings) => {
            setMeetInitialSettings(settings)
            setActiveMeetSession(lobbyMeetSession)
            setLobbyMeetSession(null)
          }}
          onCancel={() => setLobbyMeetSession(null)}
        />
      )}

      {/* Layar Video Meet Agora Fullscreen jika aktif */}
      {activeMeetSession && (
        <AgoraMeetRoom
          channelName={activeMeetSession.channelName}
          judulSesi={activeMeetSession.judul}
          userNama={profileData?.nama || "Guru Pengajar"}
          isGuru={true}
          initialSettings={meetInitialSettings}
          onLeave={async (endOption) => {
            const currentSession = activeMeetSession
            setActiveMeetSession(null)
            setMeetInitialSettings(null)
            if (currentSession && endOption === "selesai") {
              try {
                await updateStatusSesiMeet(currentSession.id, "selesai")
              } catch (e) {
                console.error("Gagal update status selesai:", e)
              }
            }
          }}
        />
      )}

      {/* Modal Popup Konfirmasi Modern (Akhiri Sesi / Hapus Jadwal) - Render via Portal ke document.body */}
      {modalConfirmAction &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 w-full h-full min-h-[100dvh] z-[999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setModalConfirmAction(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl text-slate-800 space-y-4 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    modalConfirmAction.type === "akhiri"
                      ? "bg-amber-100 text-amber-600"
                      : "bg-rose-100 text-rose-600"
                  }`}
                >
                  {modalConfirmAction.type === "akhiri" ? (
                    <Square className="w-5 h-5 fill-current" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                    {modalConfirmAction.type === "akhiri"
                      ? "Akhiri Sesi Tatap Muka?"
                      : "Hapus Jadwal Sesi Meet?"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {modalConfirmAction.type === "akhiri" ? (
                      <>
                        Apakah Anda yakin ingin menyelesaikan sesi{" "}
                        <b>"{modalConfirmAction.sesi.judul}"</b>? Status sesi akan diubah menjadi
                        SELESAI dan peserta tidak dapat bergabung lagi.
                      </>
                    ) : (
                      <>
                        Jadwal sesi <b>"{modalConfirmAction.sesi.judul}"</b> akan dihapus secara
                        permanen dari daftar meet.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  onClick={executeConfirmAction}
                  className={`w-full h-10 text-xs font-bold rounded-xl text-white shadow-md flex items-center justify-center gap-2 ${
                    modalConfirmAction.type === "akhiri"
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  }`}
                >
                  <span>
                    {modalConfirmAction.type === "akhiri" ? "Ya, Akhiri Sesi" : "Ya, Hapus Jadwal"}
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalConfirmAction(null)}
                  className="w-full h-9 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                >
                  <span>Jangan (Batal)</span>
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

