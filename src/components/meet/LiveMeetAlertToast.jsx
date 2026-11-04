import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { subscribeSesiMeetByKelas } from "@/services/meet"
import { AgoraMeetRoom } from "@/components/meet/AgoraMeetRoom"
import { PreMeetLobbyModal } from "@/components/meet/PreMeetLobbyModal"
import { Button } from "@/components/ui/button"
import { Video, ArrowRight, X } from "lucide-react"

export function LiveMeetAlertToast() {
  const { currentUser, profileData, role } = useAuth()
  const [activeSession, setActiveSession] = useState(null)
  const [inLobby, setInLobby] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [meetInitialSettings, setMeetInitialSettings] = useState(null)
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)

  // Hanya pantau jika yang login adalah murid dan sudah memiliki kelas
  const kelasId = profileData?.kelasId

  useEffect(() => {
    if (role !== "murid" || !kelasId) {
      setActiveSession(null)
      return
    }

    const unsub = subscribeSesiMeetByKelas(kelasId, (items) => {
      // Cari sesi yang statusnya 'berlangsung'
      const live = items.find((s) => s.status === "berlangsung")
      setActiveSession(live || null)
    })

    return () => unsub()
  }, [role, kelasId])

  if (!activeSession) return null

  return (
    <>
      {/* ── 1. VERSI MOBILE (HP): FLOATING ACTION ICON DI KIRI BAWAH (DI ATAS BOTTOM NAV) ── */}
      <div className="md:hidden fixed bottom-20 left-4 z-40">
        {!isMobileExpanded ? (
          /* Floating Icon Lingkaran Kompak dengan Ping Pulse */
          <button
            type="button"
            onClick={() => setIsMobileExpanded(true)}
            className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-950/40 border-2 border-white/80 active:scale-95 transition-all duration-200"
            aria-label="Ada sesi live meet guru aktif. Ketuk untuk membuka."
          >
            {/* Animasi Ping Efek Live */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[8px] font-black text-white items-center justify-center">
                !
              </span>
            </span>

            <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        ) : (
          /* Popover Detail Sesi Saat Ikon Ditekan */
          <div className="w-[280px] rounded-2xl bg-slate-900/95 text-white border border-slate-700/80 p-3.5 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 fade-in duration-150 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500 text-white uppercase tracking-wider">
                  LIVE
                </span>
                <span className="text-[11px] font-bold text-emerald-400 truncate">
                  {activeSession.kelasNama || "Kelas Anda"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileExpanded(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Tutup popover detail meet"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <h4 className="font-extrabold text-xs text-white leading-snug line-clamp-2">
                {activeSession.judul}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Guru sedang memulai sesi tatap muka online
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                setIsMobileExpanded(false)
                setInLobby(true)
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl h-8 gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-900/30"
            >
              <span>Gabung Sesi Sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── 2. VERSI TABLET & DESKTOP (MD+): TOAST MINIMALIS DI POJOK KANAN BAWAH ── */}
      <div className="hidden md:block fixed bottom-5 right-5 z-40 max-w-sm pointer-events-none animate-in slide-in-from-bottom-3 duration-200">
        <div className="pointer-events-auto p-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-950/30 border border-emerald-400/40 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 relative shadow-xs">
              <Video className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500 text-white uppercase tracking-wider">
                  LIVE
                </span>
                <span className="text-[11px] font-bold text-emerald-100 truncate">
                  {activeSession.kelasNama || "Kelas Anda"}
                </span>
              </div>
              <h4 className="font-extrabold text-xs text-white truncate mt-1">
                {activeSession.judul}
              </h4>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setInLobby(true)}
            className="shrink-0 bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold text-[11px] rounded-xl h-8 px-3 shadow-xs flex items-center gap-1 active:scale-95 transition-all"
          >
            <span>Gabung</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
          </Button>
        </div>
      </div>

      {/* Lobby Pre-Meet Preview */}
      {inLobby && (
        <PreMeetLobbyModal
          judulSesi={activeSession.judul}
          userNama={profileData?.nama || currentUser?.displayName || "Siswa"}
          isGuru={false}
          onJoin={(settings) => {
            setMeetInitialSettings(settings)
            setInCall(true)
            setInLobby(false)
          }}
          onCancel={() => setInLobby(false)}
        />
      )}

      {/* Ruang Meet Agora jika murid menekan Gabung */}
      {inCall && (
        <AgoraMeetRoom
          channelName={activeSession.channelName}
          judulSesi={activeSession.judul}
          userNama={profileData?.nama || currentUser?.displayName || "Siswa"}
          isGuru={false}
          initialSettings={meetInitialSettings}
          onLeave={() => {
            setInCall(false)
            setMeetInitialSettings(null)
          }}
        />
      )}
    </>
  )
}
