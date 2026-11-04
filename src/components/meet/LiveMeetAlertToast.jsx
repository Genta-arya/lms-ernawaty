import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { subscribeSesiMeetByKelas } from "@/services/meet"
import { AgoraMeetRoom } from "@/components/meet/AgoraMeetRoom"
import { PreMeetLobbyModal } from "@/components/meet/PreMeetLobbyModal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Video, ArrowRight, Sparkles } from "lucide-react"

export function LiveMeetAlertToast() {
  const { currentUser, profileData, role } = useAuth()
  const [activeSession, setActiveSession] = useState(null)
  const [inLobby, setInLobby] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [meetInitialSettings, setMeetInitialSettings] = useState(null)

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
      {/* Toast Alert Menempel Ringkas & Minimalis di Pojok Bawah Desktop / Bawah Navigasi Mobile */}
      <div className="fixed bottom-18 md:bottom-5 right-2.5 sm:right-5 z-40 max-w-[calc(100vw-1.25rem)] sm:max-w-xs md:max-w-sm pointer-events-none animate-in slide-in-from-bottom-3 duration-200">
        <div className="pointer-events-auto p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-950/30 border border-emerald-400/40 backdrop-blur-md flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 relative shadow-xs">
              <Video className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="inline-block px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black bg-rose-500 text-white uppercase tracking-wider">
                  LIVE
                </span>
                <span className="text-[10px] font-bold text-emerald-100 truncate">
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
            className="shrink-0 bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold text-[11px] rounded-xl h-8 px-2.5 sm:px-3 shadow-xs flex items-center gap-1 active:scale-95 transition-all"
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

