import React from "react"
import { Outlet } from "react-router-dom"
import { Navbar } from "./Navbar"
import { BottomNav } from "@/components/common/BottomNav"

export function MuridLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 pb-24 md:pb-0">
      <Navbar />
      <main className="container flex-1 py-6 md:py-8 min-w-0">
        <Outlet />
      </main>

      {/* Global Bottom Navigation Bar */}
      <BottomNav />
    </div>
  )
}
