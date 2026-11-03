import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { subscribeSesiMeetByKelas } from "@/services/meet"
import { AgoraMeetRoom } from "@/components/meet/AgoraMeetRoom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Video,
  Clock,
  Sparkles,
  Play,
  Calendar,
} from "lucide-react"

export function BannerMeetMurid({ kelasId }) {
  const { currentUser, profileData } = useAuth()
  const [sesiList, setSesiList] = useState([])
  const [activeMeet, setActiveMeet] = useState(null)

  useEffect(() => {
    if (!kelasId) return
    const unsub = subscribeSesiMeetByKelas(kelasId, (items) => {
      // Tampilkan sesi yang sedang berlangsung atau terjadwal
      const activeOrScheduled = items.filter((s) => s.status !== "selesai")
      setSesiList(activeOrScheduled)
    })
    return () => unsub()
  }, [kelasId])

  if (sesiList.length === 0) return null

  function formatWaktu(timestamp) {
    if (!timestamp) return "-"
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  }

  // Ambil sesi terdepan
  const currentSesi = sesiList[0]
  const isLive = currentSesi.status === "berlangsung"

  return (
    <>
      <div
        className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          isLive
            ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-400/40"
            : "bg-gradient-to-r from-blue-50 via-indigo-50 to-white border-blue-200/80 text-slate-900"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                isLive ? "bg-white/20 text-white backdrop-blur-md" : "bg-blue-600 text-white"
              }`}
            >
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full border-none ${
                    isLive
                      ? "bg-rose-500 text-white animate-pulse"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {isLive ? "LIVE SEKARANG" : "TERJADWAL"}
                </Badge>
                <span className={`text-[11px] font-semibold ${isLive ? "text-emerald-100" : "text-slate-500"}`}>
                  Jam {formatWaktu(currentSesi.waktuMulai)} WIB
                </span>
              </div>
              <h3 className="font-black text-sm sm:text-base mt-1 line-clamp-1">
                {currentSesi.judul}
              </h3>
              <p className={`text-xs line-clamp-1 ${isLive ? "text-emerald-100" : "text-slate-500"}`}>
                Guru: {currentSesi.guruNama} &bull; {currentSesi.deskripsi || "Sesi tatap muka virtual kelas"}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            {isLive ? (
              <Button
                type="button"
                onClick={() => setActiveMeet(currentSesi)}
                className="w-full sm:w-auto bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs rounded-2xl h-10 px-5 gap-2 shadow-md active:scale-95"
              >
                <Play className="w-4 h-4 fill-emerald-800" />
                <span>Gabung Sesi Meet</span>
              </Button>
            ) : (
              <div className="text-xs font-bold text-slate-500 bg-white/70 px-3 py-1.5 rounded-xl border border-slate-200">
                Sesi Belum Dimulai
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ruang Meet Agora Siswa */}
      {activeMeet && (
        <AgoraMeetRoom
          channelName={activeMeet.channelName}
          judulSesi={activeMeet.judul}
          userNama={profileData?.nama || currentUser?.displayName || "Siswa"}
          isGuru={false}
          onLeave={() => setActiveMeet(null)}
        />
      )}
    </>
  )
}
