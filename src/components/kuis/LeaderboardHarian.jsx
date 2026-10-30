import React, { useEffect, useState } from "react"
import { getLeaderboardHarian } from "@/services/percobaan"
import { getMuridList } from "@/services/murid"
import { getKelasList } from "@/services/kelas"
import { formatNamaKelas } from "@/lib/utils"
import { UserAvatar } from "@/components/common/UserAvatar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Flame, Clock, Sparkles, UserCheck } from "lucide-react"

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "-"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} dtk`
  return `${m}m ${s}s`
}

export function LeaderboardHarian({ kuisId = null, materiId = null, title = "Papan Peringkat Hari Ini" }) {
  const [ranks, setRanks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [data, muridList, kelasList] = await Promise.all([
          getLeaderboardHarian({ kuisId, materiId, limitCount: 10 }),
          getMuridList(),
          getKelasList(),
        ])

        // Mapping info murid (nama, foto, kelas) jika percobaan belum menyimpannya
        const muridMap = new Map()
        muridList.forEach((m) => {
          if (m.nisn) muridMap.set(m.nisn, m)
          if (m.akunMurid?.uid) muridMap.set(m.akunMurid.uid, m)
        })

        const kelasMap = {}
        kelasList.forEach((k) => {
          kelasMap[k.id] = `Kelas ${k.nama}`
        })

        const enriched = data.map((item) => {
          const mInfo = muridMap.get(item.nisn) || muridMap.get(item.uid)
          const nama = item.namaMurid || mInfo?.nama || "Pelajar"
          const foto = item.fotoMurid || mInfo?.akunMurid?.fotoUrl || null
          const rawKelas = item.kelasNama || mInfo?.kelasNama || mInfo?.kelasId || ""
          const cleanKelas = formatNamaKelas(rawKelas, kelasMap)

          return {
            ...item,
            nama,
            foto,
            cleanKelas,
          }
        })

        setRanks(enriched)
      } catch (err) {
        console.error("Gagal memuat papan peringkat:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [kuisId, materiId])

  return (
    <Card className="rounded-2xl sm:rounded-3xl border border-blue-200/80 shadow-md bg-white overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white p-4 sm:p-5 pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur text-amber-300 border border-white/20 shadow-xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2 text-white">
                <span>{title}</span>
                <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-2xs">
                  <Flame className="w-3 h-3 fill-amber-950" />
                  Live Hari Ini
                </span>
              </CardTitle>
              <p className="text-[11px] text-blue-100 font-medium">
                Peringkat nilai tuntas & tertinggi yang dikerjakan hari ini.
              </p>
            </div>
          </div>

          <Badge className="bg-white/20 text-white hover:bg-white/25 border-none text-[11px] font-bold px-2.5 py-1">
            {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date())}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-5">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            Memuat data peringkat hari ini...
          </div>
        ) : ranks.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
            <div className="text-xs sm:text-sm font-bold text-slate-700">
              Belum Ada Peringkat Hari Ini
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Jadilah murid pertama yang menyelesaikan kuis ini dengan nilai lulus hari ini untuk memuncaki papan peringkat!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ranks.map((item, index) => {
              const rank = index + 1
              const isTop1 = rank === 1
              const isTop2 = rank === 2
              const isTop3 = rank === 3

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                    isTop1
                      ? "bg-amber-50/70 border-amber-200/90 shadow-xs"
                      : isTop2
                      ? "bg-slate-50/90 border-slate-200/90"
                      : isTop3
                      ? "bg-orange-50/50 border-orange-200/70"
                      : "bg-white border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  {/* Kolom Kiri: Nomor / Badge & Profil Siswa */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isTop1
                          ? "bg-amber-400 text-amber-950 shadow-xs"
                          : isTop2
                          ? "bg-slate-200 text-slate-700"
                          : isTop3
                          ? "bg-orange-300 text-orange-950"
                          : "bg-slate-100 text-slate-500 font-bold"
                      }`}
                    >
                      {isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : rank}
                    </div>

                    {/* Avatar Foto Siswa */}
                    <UserAvatar
                      fotoUrl={item.foto}
                      nama={item.nama}
                      size="sm"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white shadow-2xs shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {item.nama}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                          {item.cleanKelas}
                        </span>
                        {item.durasiDetik && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" />
                            {formatDuration(item.durasiDetik)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Kolom Kanan: Skor & Status Lulus */}
                  <div className="text-right shrink-0">
                    <div
                      className={`text-base sm:text-lg font-black tracking-tight ${
                        isTop1 ? "text-amber-600" : "text-blue-600"
                      }`}
                    >
                      {item.skor}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded inline-flex items-center gap-0.5">
                      <UserCheck className="w-2.5 h-2.5" />
                      Lulus
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

