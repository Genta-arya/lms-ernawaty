import React, { useState, useEffect } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { Navbar } from "./Navbar"
import { BottomNav } from "@/components/common/BottomNav"
import { subscribeKlaimCount } from "@/services/klaim"
import { subscribeTugasPerluNilaiCount } from "@/services/tugas"
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  Users,
  GraduationCap,
  Inbox,
  BarChart3,
  User,
  Feather,
  ClipboardList,
  Megaphone,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function GuruLayout() {
  const location = useLocation()
  const pathname = location.pathname
  const [pendingKlaimCount, setPendingKlaimCount] = useState(0)
  const [pendingTugasCount, setPendingTugasCount] = useState(0)

  // Realtime subscription untuk jumlah permohonan aktivasi dan tugas siswa yang perlu dinilai
  useEffect(() => {
    const unsubKlaim = subscribeKlaimCount((count) => {
      setPendingKlaimCount(count)
    })
    const unsubTugas = subscribeTugasPerluNilaiCount((count) => {
      setPendingTugasCount(count)
    })
    return () => {
      unsubKlaim()
      unsubTugas()
    }
  }, [])

  const navItems = [
    { label: "Dashboard", href: "/guru", icon: LayoutDashboard },
    { label: "Pusat Pengumuman", href: "/guru/pengumuman", icon: Megaphone },
    { label: "Monitoring Karya", href: "/guru/mading", icon: Feather },
    { label: "Penugasan Siswa", href: "/guru/tugas", icon: ClipboardList },
    { label: "Materi Pembelajaran", href: "/guru/materi", icon: BookOpen },
    { label: "Kuis Latihan", href: "/guru/kuis", icon: FileQuestion },
    { label: "Progres Baca", href: "/guru/progres", icon: BarChart3 },
    { label: "Kelola Kelas", href: "/guru/kelas", icon: GraduationCap },
    { label: "Data Murid", href: "/guru/murid", icon: Users },
    { label: "Permintaan Aktivasi", href: "/guru/permintaan", icon: Inbox },
    { label: "Profil Guru", href: "/guru/profil", icon: User },
  ]

  function isTabActive(href) {
    if (href === "/guru") {
      return pathname === "/guru" || pathname === "/guru/"
    }
    if (href === "/mading") {
      return pathname.startsWith("/mading")
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24 md:pb-0">
      <Navbar />
      <div className="container flex-1 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
          {/* Sidebar Guru (Desktop only) */}
          <aside className="hidden md:block md:col-span-1 space-y-1">
            <div className="p-3 bg-card border rounded-2xl mb-4 shadow-xs sticky top-20">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block px-2 mb-2">
                Menu Pengajar
              </span>
              <nav className="flex flex-col space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = isTabActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all group",
                        active
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {/* Lencana (Badge) Realtime Permintaan Aktivasi */}
                      {item.href === "/guru/permintaan" && pendingKlaimCount > 0 && (
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 transition-colors animate-pulse",
                            active
                              ? "bg-white text-rose-600"
                              : "bg-rose-600 text-white"
                          )}
                        >
                          {pendingKlaimCount}
                        </span>
                      )}

                      {/* Lencana (Badge) Realtime Penugasan Siswa Belum Dinilai */}
                      {item.href === "/guru/tugas" && pendingTugasCount > 0 && (
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 transition-colors animate-pulse",
                            active
                              ? "bg-white text-indigo-700"
                              : "bg-indigo-600 text-white"
                          )}
                          title={`${pendingTugasCount} tugas murid belum dinilai`}
                        >
                          {pendingTugasCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="col-span-1 md:col-span-4 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Global Bottom Navigation Bar */}
      <BottomNav />
    </div>
  )
}
