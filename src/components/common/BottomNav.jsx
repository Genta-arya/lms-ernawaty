import React, { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { UserAvatar } from "@/components/common/UserAvatar"
import { subscribeKlaimCount } from "@/services/klaim"
import {
  BookOpen,
  Home,
  History,
  Feather,
  LayoutDashboard,
  Inbox,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const { currentUser, role, profileData } = useAuth()
  const location = useLocation()
  const pathname = location.pathname
  const [pendingKlaimCount, setPendingKlaimCount] = useState(0)

  // Realtime subscription aktivasi siswa untuk guru
  useEffect(() => {
    if (role !== "guru") return
    const unsubKlaim = subscribeKlaimCount((count) => {
      setPendingKlaimCount(count)
    })
    return () => unsubKlaim()
  }, [role])

  if (!currentUser) return null

  // 5 Item Menu untuk Murid
  const muridItems = [
    { label: "Beranda", href: "/murid", icon: Home },
    { label: "Kreasi", href: "/murid/mading", icon: Feather },
    { label: "Materi", href: "/murid/materi", icon: BookOpen },
    { label: "Riwayat", href: "/murid/riwayat", icon: History },
    { label: "Profil", href: "/murid/profil", icon: User, isProfile: true },
  ]

  // 5 Item Menu untuk Guru
  const guruItems = [
    { label: "Beranda", href: "/", icon: Home },
    { label: "Karya", href: "/guru/mading", icon: Feather },
    { label: "Dashboard", href: "/guru", icon: LayoutDashboard },
    { label: "Aktivasi", href: "/guru/permintaan", icon: Inbox },
    { label: "Profil", href: "/guru/profil", icon: User, isProfile: true },
  ]

  const items = role === "guru" ? guruItems : role === "murid" ? muridItems : []
  if (items.length === 0) return null

  function isTabActive(item) {
    const href = item.href
    if (href === "/") return pathname === "/"
    if (href === "/guru") {
      return (
        pathname === "/guru" ||
        pathname === "/guru/" ||
        pathname.startsWith("/guru/tugas") ||
        pathname.startsWith("/guru/pengumuman")
      )
    }
    if (href === "/murid") {
      return pathname === "/murid"
    }
    if (href === "/murid/materi") {
      return pathname.startsWith("/murid/materi") || pathname.startsWith("/materi")
    }
    return pathname.startsWith(href)
  }

  let activeIndex = items.findIndex((item) => isTabActive(item))
  if (activeIndex === -1) activeIndex = 0

  const userFoto = profileData?.fotoUrl || currentUser?.photoURL || null
  const userNama = profileData?.nama || currentUser?.displayName || currentUser?.email || "U"

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-safe">
      <div className="max-w-md mx-auto pointer-events-auto px-4 pb-3">
        {/* ── BAR GLASSMORPHISM APPLE iOS MURNI ── */}
        <nav
          aria-label="Navigasi Bawah iOS"
          className="relative bg-white/80 backdrop-blur-2xl rounded-full border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] p-1.5 flex items-center justify-between"
        >
          {/* ── PILL SELEKTOR ABU-ABU LEMBUT (SLIDING SOFT PILL) ── */}
          <div
            className="absolute top-1.5 bottom-1.5 rounded-full bg-slate-900/[0.06] transition-all duration-300 ease-out z-0 pointer-events-none"
            style={{
              width: "calc((100% - 12px) / 5)",
              left: `calc(6px + ${activeIndex} * ((100% - 12px) / 5))`,
            }}
          />

          {/* 5 ITEM MENU */}
          {items.map((item, index) => {
            const Icon = item.icon
            const active = index === activeIndex

            return (
              <Link
                key={item.href}
                to={item.href}
                className="relative z-10 flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-full focus:outline-none transition-all duration-200 group active:scale-95"
              >
                {/* Ikon / Avatar */}
                <div className="relative flex items-center justify-center">
                  {item.isProfile ? (
                    <UserAvatar
                      fotoUrl={userFoto}
                      nama={userNama}
                      size="xs"
                      className={cn(
                        "w-5 h-5 rounded-full transition-all duration-200",
                        active
                          ? "ring-2 ring-blue-600 scale-105"
                          : "opacity-60 group-hover:opacity-100"
                      )}
                      fallbackClassName={
                        active
                          ? "bg-blue-600 text-white font-black"
                          : "bg-slate-300 text-slate-700"
                      }
                    />
                  ) : (
                    <Icon
                      className={cn(
                        "w-5 h-5 transition-all duration-200",
                        active
                          ? "text-blue-600 stroke-[2.4] scale-105"
                          : "text-slate-500 group-hover:text-slate-800 stroke-[1.8] opacity-70 group-hover:opacity-100"
                      )}
                    />
                  )}

                  {/* Dot Badge Notifikasi Realtime untuk Guru */}
                  {item.href === "/guru/permintaan" && pendingKlaimCount > 0 && !active && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
                  )}
                </div>

                {/* Label Teks Minimalis Apple */}
                <span
                  className={cn(
                    "text-[10px] mt-0.5 tracking-tight transition-all duration-200 leading-none",
                    active
                      ? "text-blue-600 font-extrabold"
                      : "text-slate-500 font-medium opacity-70 group-hover:opacity-100"
                  )}
                >
                  {item.label}
                </span>

                {/* Dot Indikator Halus di Bawah Tab Aktif */}
                <span
                  className={cn(
                    "w-1 h-1 rounded-full mt-0.5 transition-all duration-200",
                    active ? "bg-blue-600 opacity-100 scale-100" : "bg-transparent opacity-0 scale-50"
                  )}
                />
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
