import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { subscribeSesiMeetByKelas } from "@/services/meet"
import { AgoraMeetRoom } from "@/components/meet/AgoraMeetRoom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Video, ArrowRight, Sparkles } from "lucide-react"

export function LiveMeetAlertToast() {
  const { currentUser, profileData, role } = useAuth()
  const [activeSession, setActiveSession] = useState(null)
  const [inCall, setInCall] = useState(false)

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
      {/* Toast Alert Menempel Permanen (Tanpa Tombol Close) di Pojok Bawah / Atas Mobile */}
      <div className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-40 max-w-sm sm:max-w-md w-full pointer-events-none animate-in slide-in-from-bottom-5 duration-300">
        <div className="pointer-events-auto p-4 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-2xl shadow-emerald-950/40 border-2 border-emerald-400/50 backdrop-blur-xl space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0 shadow-inner relative">
              <Video className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full ring-2 ring-white animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full ring-2 ring-white" />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge className="bg-rose-500 text-white font-black text-[9px] px-2 py-0 border-none animate-pulse">
                  LIVE SEKARANG
                </Badge>
                <span className="text-[11px] font-bold text-emerald-100">
                  {activeSession.kelasNama || "Kelas Anda"}
                </span>
              </div>

              <h4 className="font-black text-sm text-white truncate">
                {activeSession.judul}
              </h4>
              <p className="text-[11px] text-emerald-100 line-clamp-1">
                Guru: <b>{activeSession.guruNama}</b> sedang memulai sesi tatap muka.
              </p>
            </div>
          </div>

          <div className="pt-1">
            <Button
              type="button"
              onClick={() => setInCall(true)}
              className="w-full bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs rounded-2xl h-9 shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <span>Masuk & Gabung Sekarang</span>
              <ArrowRight className="w-4 h-4 text-emerald-700" />
            </Button>
          </div>
        </div>
      </div>

      {/* Ruang Meet Agora jika murid menekan Gabung */}
      {inCall && (
        <AgoraMeetRoom
          channelName={activeSession.channelName}
          judulSesi={activeSession.judul}
          userNama={profileData?.nama || currentUser?.displayName || "Siswa"}
          isGuru={false}
          onLeave={() => setInCall(false)}
        />
      )}
    </>
  )
}
