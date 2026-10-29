import React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { AuthSplashScreen } from "@/components/ui/loading-skeletons"

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { currentUser, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AuthSplashScreen message="Memverifikasi akun belajar Anda..." />
  }

  // Jika belum login sama sekali
  if (!currentUser) {
    if (allowedRoles.includes("guru")) {
      return <Navigate to="/guru/login" state={{ from: location }} replace />
    }
    return <Navigate to="/masuk" state={{ from: location }} replace />
  }

  // Khusus halaman aktivasi: izinkan jika user sudah login
  if (location.pathname === "/aktivasi") {
    return children
  }

  // Jika akun murid belum aktivasi dan rute saat ini bukan /aktivasi
  if (role === "unactivated") {
    return <Navigate to="/aktivasi" replace />
  }

  // Cek otorisasi peran
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === "guru") return <Navigate to="/guru" replace />
    if (role === "murid") return <Navigate to="/murid" replace />
    return <Navigate to="/aktivasi" replace />
  }

  return children
}
