import React, { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  subscribeGuruNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  dismissAllNotifications,
} from "@/services/notifikasi"
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  UserPlus,
  ClipboardList,
  FileQuestion,
  Feather,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Clock,
  CheckCircle2,
  Award,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function NotificationMenu() {
  const [open, setOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all") // "all" | "tugas" | "kuis" | "aktivasi" | "karya"
  const [notifData, setNotifData] = useState({
    unreadCount: 0,
    totalAktivasi: 0,
    totalTugasBelumDinilai: 0,
    totalKuisSelesai: 0,
    aktivasiList: [],
    tugasBelumDinilaiList: [],
    kuisSelesaiList: [],
    karyaTerbaruList: [],
    allNotifications: [],
  })

  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = subscribeGuruNotifications((data) => {
      setNotifData(data)
    })
    return () => unsub()
  }, [])

  // Close popup saat klik di luar
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Urutkan berdasarkan waktu terbaru
  const allNotifications = [...(notifData.allNotifications || [])].sort(
    (a, b) => b.createdAt - a.createdAt
  )

  const filteredNotifications =
    activeFilter === "all"
      ? allNotifications
      : allNotifications.filter((n) => n.type === activeFilter)

  function formatTimeAgo(date) {
    if (!date) return "Baru saja"
    const seconds = Math.floor((new Date() - date) / 1000)
    if (seconds < 60) return "Baru saja"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m lalu`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}j lalu`
    const days = Math.floor(hours / 24)
    return `${days}h lalu`
  }

  function handleItemClick(notif) {
    markNotificationAsRead(notif.id)
    setNotifData((prev) => ({
      ...prev,
      unreadCount: Math.max(0, prev.unreadCount - (notif.isRead ? 0 : 1)),
      allNotifications: prev.allNotifications.map((n) =>
        n.id === notif.id ? { ...n, isRead: true } : n
      ),
    }))
    setOpen(false)
    navigate(notif.link)
  }

  function handleMarkAllRead() {
    const ids = allNotifications.map((n) => n.id)
    markAllNotificationsAsRead(ids)
    setNotifData((prev) => ({
      ...prev,
      unreadCount: 0,
      allNotifications: prev.allNotifications.map((n) => ({ ...n, isRead: true })),
    }))
  }

  function handleDismissOne(e, id) {
    e.stopPropagation()
    dismissNotification(id)
    setNotifData((prev) => {
      const remaining = prev.allNotifications.filter((n) => n.id !== id)
      return {
        ...prev,
        unreadCount: remaining.filter((n) => !n.isRead).length,
        allNotifications: remaining,
      }
    })
  }

  function handleDismissAll() {
    const ids = allNotifications.map((n) => n.id)
    dismissAllNotifications(ids)
    setNotifData((prev) => ({
      ...prev,
      unreadCount: 0,
      totalAktivasi: 0,
      totalTugasBelumDinilai: 0,
      totalKuisSelesai: 0,
      allNotifications: [],
    }))
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Tombol Lonceng Notifikasi */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "relative p-2 rounded-full transition-all duration-200 outline-hidden flex items-center justify-center",
          open
            ? "bg-blue-50 text-blue-600 ring-2 ring-blue-500/20"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
        )}
        title="Pusat Notifikasi Guru"
        aria-label="Notifikasi Guru"
      >
        <Bell className="w-5 h-5 stroke-[2.2] transition-transform group-hover:scale-105" />

        {/* Badge Lonceng Real-time */}
        {notifData.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-xs animate-pulse ring-2 ring-white">
            {notifData.unreadCount > 99 ? "99+" : notifData.unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Floating Panel Modern */}
      {open && (
        <div className="absolute right-0 sm:-right-4 mt-3 w-[360px] sm:w-[440px] max-w-[94vw] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
          {/* Header Panel */}
          <div className="p-4 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/25 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                    Monitoring & Notifikasi Siswa
                  </h4>
                  <p className="text-[10px] text-blue-200/80 font-medium">
                    {notifData.unreadCount > 0
                      ? `${notifData.unreadCount} aktivitas baru perlu perhatian Anda`
                      : "Semua aktivitas pembelajaran telah ditinjau"}
                  </p>
                </div>
              </div>

              {/* Action Buttons Header: Tandai Baca & Hapus Semua */}
              {allNotifications.length > 0 && (
                <div className="flex items-center gap-1">
                  {notifData.unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      title="Tandai semua sudah dibaca"
                      className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tandai Baca</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDismissAll}
                    title="Kosongkan semua notifikasi"
                    className="p-1.5 rounded-lg text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hapus Semua</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/10 overflow-x-auto scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-full font-bold text-[11px] transition-all shrink-0",
                  activeFilter === "all"
                    ? "bg-white text-blue-900 shadow-xs"
                    : "text-blue-200/90 hover:bg-white/10"
                )}
              >
                Semua ({allNotifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("tugas")}
                className={cn(
                  "px-2.5 py-1 rounded-full font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
                  activeFilter === "tugas"
                    ? "bg-indigo-400 text-indigo-950 font-black shadow-xs"
                    : "text-indigo-200/90 hover:bg-white/10"
                )}
              >
                Tugas ({notifData.totalTugasBelumDinilai})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("kuis")}
                className={cn(
                  "px-2.5 py-1 rounded-full font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
                  activeFilter === "kuis"
                    ? "bg-emerald-400 text-emerald-950 font-black shadow-xs"
                    : "text-emerald-200/90 hover:bg-white/10"
                )}
              >
                Kuis ({notifData.totalKuisSelesai})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("aktivasi")}
                className={cn(
                  "px-2.5 py-1 rounded-full font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
                  activeFilter === "aktivasi"
                    ? "bg-amber-400 text-amber-950 font-black shadow-xs"
                    : "text-amber-200/90 hover:bg-white/10"
                )}
              >
                Aktivasi ({notifData.totalAktivasi})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("karya")}
                className={cn(
                  "px-2.5 py-1 rounded-full font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
                  activeFilter === "karya"
                    ? "bg-rose-400 text-rose-950 font-black shadow-xs"
                    : "text-rose-200/90 hover:bg-white/10"
                )}
              >
                Karya
              </button>
            </div>
          </div>

          {/* List Notifikasi */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2.5 shadow-xs">
                  <CheckCircle2 className="w-6 h-6 stroke-[1.5] text-emerald-500" />
                </div>
                <p className="text-xs font-bold text-slate-800">Tidak ada notifikasi baru</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Belum ada tugas atau kuis baru yang dikerjakan murid saat ini.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isTugas = notif.type === "tugas"
                const isKuis = notif.type === "kuis"
                const isAktivasi = notif.type === "aktivasi"
                const isKarya = notif.type === "karya"

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={cn(
                      "p-3.5 transition-colors cursor-pointer group flex items-start gap-3 relative",
                      notif.isRead
                        ? "bg-white/60 hover:bg-white text-slate-600"
                        : "bg-blue-50/40 hover:bg-blue-50/70 text-slate-900"
                    )}
                  >
                    {/* Dot Indikator Belum Dibaca */}
                    {!notif.isRead && (
                      <span className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                    )}

                    {/* Icon Sesuai Tipe */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-xs mt-0.5",
                        isTugas && "bg-indigo-100 text-indigo-700 border border-indigo-200",
                        isKuis && "bg-emerald-100 text-emerald-700 border border-emerald-200",
                        isAktivasi && "bg-amber-100 text-amber-700 border border-amber-200",
                        isKarya && "bg-rose-100 text-rose-700 border border-rose-200"
                      )}
                    >
                      {isTugas && <ClipboardList className="w-4 h-4" />}
                      {isKuis && <FileQuestion className="w-4 h-4" />}
                      {isAktivasi && <UserPlus className="w-4 h-4" />}
                      {isKarya && <Feather className="w-4 h-4" />}
                    </div>

                    {/* Konten Notifikasi */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                              isTugas && "bg-indigo-100/70 text-indigo-800",
                              isKuis && "bg-emerald-100/70 text-emerald-800",
                              isAktivasi && "bg-amber-100/70 text-amber-800",
                              isKarya && "bg-rose-100/70 text-rose-800"
                            )}
                          >
                            {notif.title}
                          </span>

                          {/* Tag Skor Kuis */}
                          {isKuis && (
                            <span
                              className={cn(
                                "text-[10px] font-black px-1.5 py-0.2 rounded-full",
                                notif.lulus
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              )}
                            >
                              Skor: {notif.skor}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>

                      <p
                        className={cn(
                          "text-xs truncate transition-colors",
                          notif.isRead
                            ? "font-medium text-slate-700 group-hover:text-blue-600"
                            : "font-bold text-slate-900 group-hover:text-blue-600"
                        )}
                      >
                        {isTugas && `${notif.nama} mengumpulkan tugas baru`}
                        {isKuis && `${notif.nama} baru saja menyelesaikan kuis`}
                        {isAktivasi && `${notif.nama} (${notif.nisn})`}
                        {isKarya && `"${notif.judulKarya}" oleh ${notif.nama}`}
                      </p>

                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {isTugas && "Tugas perlu dinilai dan diberi umpan balik. Ketuk untuk mengevaluasi."}
                        {isKuis && `Hasil pengerjaan: ${notif.lulus ? "LULUS" : "REMIDI"} (Skor ${notif.skor}). Ketuk untuk monitoring.`}
                        {isAktivasi && "Permohonan aktivasi siswa baru. Ketuk untuk verifikasi."}
                        {isKarya && `Karya mading baru kategori: ${notif.kategori || "Umum"}`}
                      </p>
                    </div>

                    {/* Aksi Baris: Tombol Hapus Satuan & Panah */}
                    <div className="flex items-center gap-1 shrink-0 self-center">
                      <button
                        type="button"
                        onClick={(e) => handleDismissOne(e, notif.id)}
                        title="Hapus notifikasi ini"
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-70 group-hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors hidden sm:block" />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Panel */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              to="/guru/tugas"
              onClick={() => setOpen(false)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Semua Tugas</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              to="/guru/progres"
              onClick={() => setOpen(false)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <span>Monitoring Progres</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
