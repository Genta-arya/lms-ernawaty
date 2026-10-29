import React from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Navbar } from "./Navbar"
import { Footer } from "./Footer"
import { BottomNav } from "@/components/common/BottomNav"

export function PublicLayout() {
  const location = useLocation()
  const isBeranda = location.pathname === "/"

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24 md:pb-0">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      {/* Footer hanya ditampilkan di halaman Beranda (path: '/') */}
      {isBeranda && <Footer />}

      {/* Bottom Navigation Bar (Otomatis muncul di mobile sesuai role pengguna) */}
      <BottomNav />
    </div>
  )
}
