import React from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import {
  LayoutDashboard,
  BookOpen,
  Home,
  History,
  Feather,
  Inbox,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const { currentUser, role, profileData } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

  if (!currentUser) return null

  // Data Avatar & Inisial Pengguna
  const userFoto = profileData?.fotoUrl || currentUser?.photoURL || null
  const userNama = profileData?.nama || currentUser?.displayName || currentUser?.email || "U"
  const userInitial = userNama.charAt(0).toUpperCase()

  // 1. Menu Mobile untuk Murid (Materi di TENGAH, Profil pakai Avatar/Inisial)
  const muridItems = [
    { label: "Beranda", href: "/", icon: Home },
    { label: "Kreasi", href: "/murid/mading", icon: Feather },
    {
      label: "Materi",
      href: "/murid",
      icon: BookOpen,
      isCenter: true,
    },
    { label: "Riwayat", href: "/murid/riwayat", icon: History },
    { label: "Profil", href: "/murid/profil", isProfile: true },
  ]

  // 2. Menu Mobile untuk Guru (Dashboard di TENGAH, Profil pakai Avatar/Inisial)
  const guruItems = [
    { label: "Beranda", href: "/", icon: Home },
    { label: "Karya", href: "/guru/mading", icon: Feather },
    {
      label: "Dashboard",
      href: "/guru",
      icon: LayoutDashboard,
      isCenter: true,
    },
    { label: "Aktivasi", href: "/guru/permintaan", icon: Inbox },
    { label: "Profil", href: "/guru/profil", isProfile: true },
  ]

  const items = role === "guru" ? guruItems : role === "murid" ? muridItems : []
  if (items.length === 0) return null

  function isTabActive(item) {
    const href = item.href
    if (href === "/") return pathname === "/"
    if (href === "/guru") return pathname === "/guru" || pathname === "/guru/"
    if (href === "/murid") {
      return (
        pathname === "/murid" ||
        pathname.startsWith("/murid/kuis") ||
        pathname.startsWith("/murid/hasil") ||
        pathname.startsWith("/materi")
      )
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* Wrapper Bar Navigasi dengan Frosted Glass */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="pointer-events-auto bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 h-16 sm:h-[68px] flex items-center justify-around max-w-lg mx-auto relative safe-bottom"
      >
        {items.map((item) => {
          const Icon = item.icon
          const active = isTabActive(item)

          // ── 1. ITEM TENGAH HERO (MATERI) ──
          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                to={item.href}
                className="group relative -top-4 sm:-top-5 flex flex-col items-center justify-center shrink-0 focus:outline-none"
              >
                {/* Floating Outer Squircle dengan Gradient Biru-Indigo & Ambient Glow */}
                <div
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl transition-all duration-300 active:scale-90",
                    active
                      ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-blue-500/40 scale-105 ring-4 ring-blue-500/20"
                      : "bg-gradient-to-tr from-blue-500 via-blue-600 to-indigo-600 text-white shadow-blue-500/25 group-hover:scale-105"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-6 h-6 transition-transform duration-200",
                      active ? "stroke-[2.4] scale-105" : "stroke-[2.1]"
                    )}
                  />
                </div>

                {/* Label Teks Menu Tengah */}
               

                {/* Dot Indikator Aktif */}
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1 animate-pulse" />
                )}
              </Link>
            )
          }

          // ── 2. ITEM PROFIL DENGAN AVATAR / INISIAL ──
          if (item.isProfile) {
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 min-w-[56px] focus:outline-none group",
                  active
                    ? "text-blue-600 font-bold"
                    : "text-slate-400 hover:text-slate-600 font-medium"
                )}
              >
                {/* Avatar Bulat atau Inisial */}
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center overflow-hidden transition-all duration-200 border-2",
                    active
                      ? "border-blue-600 ring-2 ring-blue-500/30 scale-105 shadow-xs"
                      : "border-slate-300 group-hover:border-slate-400"
                  )}
                >
                  {userFoto ? (
                    <img
                      src={userFoto}
                      alt={userNama}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-full h-full flex items-center justify-center text-[10px] font-black leading-none transition-colors",
                        active
                          ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white"
                          : "bg-slate-200 text-slate-700 group-hover:bg-slate-300"
                      )}
                    >
                      {userInitial}
                    </div>
                  )}
                </div>

                <span
                  className={cn(
                    "text-[10px] mt-0.5 tracking-tight transition-colors leading-none",
                    active ? "text-blue-600 font-bold" : "text-slate-400 font-medium"
                  )}
                >
                  {item.label}
                </span>

                {/* Dot Indikator Aktif */}
                <span
                  className={cn(
                    "w-1 h-1 rounded-full mt-1 transition-all",
                    active ? "bg-blue-600 opacity-100" : "bg-transparent opacity-0"
                  )}
                />
              </Link>
            )
          }

          // ── 3. ITEM BIASA (BERANDA, KREASI, RIWAYAT, AKTIVASI) ──
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 min-w-[56px] focus:outline-none group",
                active
                  ? "text-blue-600 font-bold"
                  : "text-slate-400 hover:text-slate-600 font-medium"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-xl transition-all duration-200",
                  active
                    ? "bg-blue-50 text-blue-600 scale-105 shadow-xs"
                    : "bg-transparent text-slate-400 group-hover:text-slate-600"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    active ? "stroke-[2.5]" : "stroke-[1.8]"
                  )}
                />
              </div>

              <span
                className={cn(
                  "text-[10px] mt-0.5 tracking-tight transition-colors leading-none",
                  active ? "text-blue-600 font-bold" : "text-slate-400 font-medium"
                )}
              >
                {item.label}
              </span>

              {/* Dot Indikator Aktif */}
              <span
                className={cn(
                  "w-1 h-1 rounded-full mt-1 transition-all",
                  active ? "bg-blue-600 opacity-100" : "bg-transparent opacity-0"
                )}
              />
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
