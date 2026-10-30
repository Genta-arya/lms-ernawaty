import React, { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import {
  subscribeMuridNotifications,
  markMuridNotificationAsRead,
  markAllMuridNotificationsAsRead,
} from "@/services/notifikasiMurid"
import {
  Bell,
  BookOpen,
  FileQuestion,
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  CheckCheck,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function MuridNotificationMenu() {
  const { currentUser, profileData } = useAuth()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all") // "all" | "materi" | "tugas" | "kuis"
  const [notifState, setNotifState] = useState({
    all: [],
    materi: [],
    kuis: [],
    tugas: [],
    unreadCount: 0,
  })

  const menuRef = useRef(null)

  // Realtime Firestore Listener untuk notifikasi materi, tugas, dan kuis
  useEffect(() => {
    if (!currentUser?.uid) return

    const unsub = subscribeMuridNotifications(
      {
        uid: currentUser.uid,
        studentTingkat: profileData?.tingkat || profileData?.kelasNama,
        studentKelasId: profileData?.kelasId || null,
      },
      (data) => {
        setNotifState(data)
      }
    )

    return () => unsub()
  }, [currentUser?.uid, profileData?.tingkat, profileData?.kelasNama, profileData?.kelasId])

  // Tutup dropdown saat klik di luar
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

  // Daftar notifikasi sesuai tab aktif
  const currentList =
    activeTab === "all"
      ? notifState.all
      : activeTab === "materi"
      ? notifState.materi
      : activeTab === "tugas"
      ? notifState.tugas
      : notifState.kuis

  function handleMarkAllRead() {
    const ids = notifState.all.map((n) => n.id)
    markAllMuridNotificationsAsRead(ids)
    setNotifState((prev) => ({
      ...prev,
      unreadCount: 0,
      all: prev.all.map((n) => ({ ...n, isUnread: false })),
      materi: prev.materi.map((n) => ({ ...n, isUnread: false })),
      kuis: prev.kuis.map((n) => ({ ...n, isUnread: false })),
      tugas: prev.tugas.map((n) => ({ ...n, isUnread: false })),
    }))
  }

  function handleItemClick(notifId) {
    markMuridNotificationAsRead(notifId)
    setNotifState((prev) => {
      const nextAll = prev.all.map((n) => (n.id === notifId ? { ...n, isUnread: false } : n))
      return {
        ...prev,
        all: nextAll,
        unreadCount: nextAll.filter((n) => n.isUnread).length,
      }
    })
    setOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Tombol Lonceng Notifikasi */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Pusat Notifikasi Belajar Siswa"
        aria-label="Notifikasi Siswa"
        className={cn(
          "relative flex items-center justify-center w-9 h-9 rounded-full transition-all",
          open
            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-600/30"
            : "text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/80 active:scale-95"
        )}
      >
        <Bell className="w-4 h-4 stroke-[2.2]" />

        {/* Badge Live Counter Unread */}
        {notifState.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white animate-pulse">
            {notifState.unreadCount > 9 ? "9+" : notifState.unreadCount}
          </span>
        )}
      </button>

      {/* Panel Dropdown Notifikasi */}
      {open && (
        <div className="fixed sm:absolute inset-x-3 top-16 sm:inset-x-auto sm:right-0 sm:top-full mt-2 sm:w-96 max-h-[82vh] bg-white rounded-3xl border border-slate-200/90 shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header Panel */}
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Bell className="w-4 h-4 text-white stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight leading-none text-white">
                  Notifikasi Belajar
                </h3>
                <span className="text-[10px] text-blue-100 font-medium mt-0.5 block">
                  {notifState.unreadCount > 0
                    ? `${notifState.unreadCount} info materi, tugas & kuis baru`
                    : "Semua kabar terbaru telah kamu lihat"}
                </span>
              </div>
            </div>

            {notifState.all.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                title="Tandai semua dibaca"
                className="text-[11px] font-bold text-blue-100 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Baca Semua</span>
              </button>
            )}
          </div>

          {/* Baris Tab Filter (Semua, Materi, Tugas, Kuis) */}
          <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-100 overflow-x-auto no-scrollbar text-xs font-bold">
            {[
              { id: "all", label: "Semua", count: notifState.unreadCount },
              { id: "materi", label: "Materi", count: notifState.materi.filter((n) => n.isUnread).length },
              { id: "tugas", label: "Tugas", count: notifState.tugas.filter((n) => n.isUnread).length },
              { id: "kuis", label: "Kuis", count: notifState.kuis.filter((n) => n.isUnread).length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5",
                  activeTab === tab.id
                    ? "bg-white text-blue-600 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[9px] font-black",
                      activeTab === tab.id ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Daftar Item Notifikasi Live */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 max-h-80 sm:max-h-96">
            {currentList.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Tidak ada notifikasi dalam kategori ini</p>
                <p className="text-[11px] text-slate-400">
                  Saat Ibu Guru menerbitkan materi, tugas atau kuis baru, info akan langsung tampil di sini secara realtime.
                </p>
              </div>
            ) : (
              currentList.map((item) => {
                const IconComponent =
                  item.type === "materi"
                    ? BookOpen
                    : item.type === "tugas"
                    ? ClipboardList
                    : FileQuestion

                const iconBg =
                  item.type === "materi"
                    ? "bg-indigo-100 text-indigo-700"
                    : item.type === "tugas"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-purple-100 text-purple-700"

                return (
                  <Link
                    key={item.id}
                    to={item.link}
                    onClick={() => handleItemClick(item.id)}
                    className={cn(
                      "p-3.5 flex items-start gap-3 hover:bg-slate-50/80 transition-colors group relative",
                      item.isUnread ? "bg-blue-50/30" : "bg-white"
                    )}
                  >
                    {/* Unread indicator dot */}
                    {item.isUnread && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 absolute left-1.5 top-5" />
                    )}

                    <div
                      className={cn(
                        "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs",
                        iconBg
                      )}
                    >
                      <IconComponent className="w-4 h-4 stroke-[2.2]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase px-1.5 py-0.5 rounded border",
                            item.badgeColor
                          )}
                        >
                          {item.badge}
                        </span>

                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {item.time
                              ? new Date(item.time).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : "Baru saja"}
                          </span>
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed font-normal">
                        {item.desc}
                      </p>
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          {/* Footer Panel */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/murid/materi"
              onClick={() => setOpen(false)}
              className="text-xs font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto py-0.5"
            >
              <span>Buka Katalog Belajar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
