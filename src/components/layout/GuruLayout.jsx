import React from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { Navbar } from "./Navbar"
import { BottomNav } from "@/components/common/BottomNav"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

export function GuruLayout() {
  const location = useLocation()
  const pathname = location.pathname

  const navItems = [
    { label: "Dashboard", href: "/guru", icon: LayoutDashboard },
    { label: "Monitoring Karya", href: "/guru/mading", icon: Feather },
    { label: "Kelola Kelas", href: "/guru/kelas", icon: GraduationCap },
    { label: "Data Murid", href: "/guru/murid", icon: Users },
    { label: "Permintaan Aktivasi", href: "/guru/permintaan", icon: Inbox },
    { label: "Materi Pembelajaran", href: "/guru/materi", icon: BookOpen },
    { label: "Kuis Latihan", href: "/guru/kuis", icon: FileQuestion },
    { label: "Progres Baca", href: "/guru/progres", icon: BarChart3 },
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
                        "flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all",
                        active
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
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
