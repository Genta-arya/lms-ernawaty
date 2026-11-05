import React, { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Play,
  CalendarCheck2,
  CalendarDays,
  Sparkles,
} from "lucide-react"

export function KalenderMeetKelas({
  sesiList = [],
  onJoinMeet,
  onBukaMeetGuru,
  isGuru = false,
  kelasNama = "",
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [filterMode, setFilterMode] = useState("all") // "all" | "terjadwal" | "berlangsung" | "selesai"

  // Nama-nama bulan Indonesia
  const bulanIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ]
  const hariIndo = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Navigasi bulan
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }
  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  // Parse tanggal sesi ke Date object
  const parseSesiDate = (sesi) => {
    if (!sesi?.waktuMulai) return new Date()
    if (sesi.waktuMulai.toDate) return sesi.waktuMulai.toDate()
    return new Date(sesi.waktuMulai)
  }

  // Format jam menit
  const formatJam = (date) => {
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  }

  // Map sesi berdasarkan string tanggal "YYYY-MM-DD"
  const sesiByDate = useMemo(() => {
    const map = {}
    sesiList.forEach((s) => {
      const d = parseSesiDate(s)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      if (!map[key]) map[key] = []
      map[key].push(s)
    })
    return map
  }, [sesiList])

  // Menghitung tanggal dalam grid kalender
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Minggu
    const lastDate = new Date(year, month + 1, 0).getDate()
    const prevLastDate = new Date(year, month, 0).getDate()

    const days = []

    // Hari dari bulan sebelumnya
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: prevLastDate - i,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      })
    }

    // Hari bulan ini
    for (let i = 1; i <= lastDate; i++) {
      days.push({
        date: i,
        month: month,
        year: year,
        isCurrentMonth: true,
      })
    }

    // Hari bulan berikutnya hingga memenuhi kelipatan 7
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: i,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      })
    }

    return days
  }, [year, month])

  const selectedDateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
  const todayKey = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  })()

  // Sesi pada tanggal yang dipilih
  const sesiSelectedDate = useMemo(() => {
    const list = sesiByDate[selectedDateKey] || []
    if (filterMode === "all") return list
    return list.filter((s) => s.status === filterMode)
  }, [sesiByDate, selectedDateKey, filterMode])

  // Sesi mendatang terdekat (upcoming)
  const upcomingSesi = useMemo(() => {
    return [...sesiList]
      .filter((s) => s.status !== "selesai")
      .sort((a, b) => {
        if (a.status === "berlangsung") return -1
        if (b.status === "berlangsung") return 1
        return parseSesiDate(a).getTime() - parseSesiDate(b).getTime()
      })
      .slice(0, 4)
  }, [sesiList])

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Kalender */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold w-fit mb-2">
            <CalendarCheck2 className="w-3.5 h-3.5 text-blue-200" />
            <span>Jadwal Tatap Muka & Zoom Meet</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Kalender Pertemuan {kelasNama ? `Kelas ${kelasNama}` : ""}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">
            Pantau dan ikuti jadwal tatap muka virtual pembelajaran secara terorganisir per tanggal.
          </p>
        </div>

        {/* Navigasi Bulan */}
        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur border border-white/10 self-start sm:self-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-xl text-white hover:bg-white/20 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-black px-2 min-w-[130px] text-center">
            {bulanIndo[month]} {year}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-xl text-white hover:bg-white/20 active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleToday}
            className="h-8 px-2.5 rounded-xl text-white text-xs font-bold hover:bg-white/20 active:scale-95 ml-1"
          >
            Hari Ini
          </Button>
        </div>
      </div>

      {/* Konten Utama Kalender (Grid Kalender + Panel Detail Tanggal) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        {/* Kolom Kiri: Grid Kalender Interaktif (7 cols di desktop) */}
        <div className="lg:col-span-7 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>Pilih tanggal untuk melihat jadwal sesi:</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Terjadwal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                Selesai
              </span>
            </div>
          </div>

          {/* Header Nama Hari */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {hariIndo.map((h, i) => (
              <div
                key={h}
                className={`py-1.5 text-[11px] font-black rounded-lg ${
                  i === 0 ? "text-rose-500 bg-rose-50/50" : "text-slate-600 bg-slate-50"
                }`}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Kotak Tanggal */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((item, idx) => {
              const itemDateKey = `${item.year}-${String(item.month + 1).padStart(2, "0")}-${String(item.date).padStart(2, "0")}`
              const sessionsOnDay = sesiByDate[itemDateKey] || []
              const isSelected = itemDateKey === selectedDateKey
              const isToday = itemDateKey === todayKey

              const hasLive = sessionsOnDay.some((s) => s.status === "berlangsung")
              const hasUpcoming = sessionsOnDay.some((s) => s.status === "terjadwal")
              const hasCompleted = sessionsOnDay.some((s) => s.status === "selesai")

              return (
                <button
                  key={`${itemDateKey}-${idx}`}
                  type="button"
                  onClick={() => setSelectedDate(new Date(item.year, item.month, item.date))}
                  className={`min-h-[58px] sm:min-h-[68px] p-1.5 rounded-2xl flex flex-col justify-between items-stretch text-left transition-all border relative group ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/80 shadow-xs ring-2 ring-blue-500/20"
                      : isToday
                      ? "border-amber-400/80 bg-amber-50/30 hover:border-amber-500"
                      : item.isCurrentMonth
                      ? "border-slate-100 bg-white hover:bg-slate-50/80 hover:border-slate-300"
                      : "border-transparent bg-slate-50/40 text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black inline-flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                        isToday
                          ? "bg-amber-500 text-white font-extrabold shadow-xs"
                          : isSelected
                          ? "bg-blue-600 text-white"
                          : item.isCurrentMonth
                          ? "text-slate-800 group-hover:text-blue-600"
                          : "text-slate-400"
                      }`}
                    >
                      {item.date}
                    </span>

                    {/* Titik Indikator Sesi */}
                    {sessionsOnDay.length > 0 && (
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700">
                        {sessionsOnDay.length}
                      </span>
                    )}
                  </div>

                  {/* Dot / Chip status sesi di kalender */}
                  <div className="mt-1 flex flex-wrap gap-1 items-center">
                    {hasLive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sesi Berlangsung" />
                    )}
                    {hasUpcoming && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" title="Sesi Terjadwal" />
                    )}
                    {hasCompleted && !hasLive && !hasUpcoming && (
                      <span className="w-2 h-2 rounded-full bg-slate-300" title="Sesi Selesai" />
                    )}
                    {sessionsOnDay.length > 0 && (
                      <span className="text-[9px] font-bold text-slate-500 truncate hidden sm:inline">
                        {sessionsOnDay[0].judul}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Quick Info Bar */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span>
                Total <b>{sesiList.length}</b> sesi temu virtual tercatat untuk kelas ini.
              </span>
            </span>
          </div>
        </div>

        {/* Kolom Kanan: Rincian Jadwal pada Tanggal Terpilih (5 cols di desktop) */}
        <div className="lg:col-span-5 p-4 sm:p-6 bg-slate-50/50 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div>
                <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                  Rincian Pertemuan
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {selectedDate.toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
              </div>

              {selectedDateKey === todayKey && (
                <Badge className="bg-amber-500 text-white font-extrabold text-[10px] px-2.5 py-0.5">
                  Hari Ini
                </Badge>
              )}
            </div>

            {/* Filter Sesi pada tanggal ini */}
            {sesiByDate[selectedDateKey]?.length > 0 && (
              <div className="flex items-center gap-1 mt-3 overflow-x-auto no-scrollbar">
                {[
                  { id: "all", label: "Semua" },
                  { id: "berlangsung", label: "Live" },
                  { id: "terjadwal", label: "Terjadwal" },
                  { id: "selesai", label: "Selesai" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterMode(f.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      filterMode === f.id
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {/* List Jadwal pada Tanggal Ini */}
            <div className="mt-3.5 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {sesiSelectedDate.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-200 bg-white">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                    <CalendarIcon className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-800">Tidak ada jadwal sesi</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Belum ada pertemuan tatap muka virtual atau Zoom meet yang dijadwalkan pada tanggal ini.
                  </p>
                </div>
              ) : (
                sesiSelectedDate.map((sesi) => {
                  const isLive = sesi.status === "berlangsung"
                  const isCompleted = sesi.status === "selesai"
                  const sesiDate = parseSesiDate(sesi)

                  return (
                    <div
                      key={sesi.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isLive
                          ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 ring-2 ring-emerald-500/20"
                          : isCompleted
                          ? "bg-white border-slate-200 opacity-75"
                          : "bg-white border-blue-200/80 shadow-xs hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full border-none ${
                                isLive
                                  ? "bg-emerald-600 text-white animate-pulse"
                                  : isCompleted
                                  ? "bg-slate-200 text-slate-600"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {isLive ? "LIVE SEKARANG" : isCompleted ? "SELESAI" : "TERJADWAL"}
                            </Badge>
                            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatJam(sesiDate)} WIB
                            </span>
                          </div>

                          <h4 className="font-black text-xs sm:text-sm text-slate-900 leading-snug">
                            {sesi.judul}
                          </h4>
                          {sesi.deskripsi && (
                            <p className="text-[11px] text-slate-500 line-clamp-2">
                              {sesi.deskripsi}
                            </p>
                          )}
                          <div className="text-[10px] text-slate-400 pt-1 flex items-center gap-2">
                            <span>Pengampu: <b>{sesi.guruNama || "Guru"}</b></span>
                            {sesi.kelasNama && <span>&bull; Kelas: {sesi.kelasNama}</span>}
                          </div>
                        </div>

                        {/* Tombol Aksi */}
                        <div className="shrink-0 pt-0.5">
                          {isLive ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                if (isGuru && onBukaMeetGuru) {
                                  onBukaMeetGuru(sesi)
                                } else if (onJoinMeet) {
                                  onJoinMeet(sesi)
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] h-8 px-3 rounded-xl gap-1.5 shadow-sm active:scale-95"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>{isGuru ? "Buka Room" : "Gabung"}</span>
                            </Button>
                          ) : !isCompleted && isGuru ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => onBukaMeetGuru && onBukaMeetGuru(sesi)}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50 font-bold text-[11px] h-8 px-2.5 rounded-xl gap-1"
                            >
                              <Video className="w-3 h-3" />
                              <span>Mulai</span>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Sesi Mendatang Ringkas (Next Upcoming) */}
          {upcomingSesi.length > 0 && (
            <div className="pt-3 border-t border-slate-200/80">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Jadwal Tatap Muka Terdekat
              </span>
              <div className="space-y-1.5">
                {upcomingSesi.slice(0, 2).map((s) => {
                  const sDate = parseSesiDate(s)
                  return (
                    <div
                      key={s.id}
                      className="p-2 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between text-[11px]"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-800 truncate block">
                          {s.judul}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {sDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} &bull; {formatJam(sDate)} WIB
                        </span>
                      </div>
                      {s.status === "berlangsung" ? (
                        <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 shrink-0">
                          LIVE
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.2 shrink-0">
                          Akan Datang
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

