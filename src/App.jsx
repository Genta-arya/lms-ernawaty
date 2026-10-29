import React from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/common/ProtectedRoute"

// Layouts
import { PublicLayout } from "@/components/layout/PublicLayout"
import { GuruLayout } from "@/components/layout/GuruLayout"
import { MuridLayout } from "@/components/layout/MuridLayout"

// Public Pages
import { Beranda } from "@/pages/Beranda"
import { MateriDetail } from "@/pages/MateriDetail"
import { Masuk } from "@/pages/Masuk"
import { Aktivasi } from "@/pages/Aktivasi"
import { Mading } from "@/pages/Mading"

// Guru Pages
import { Login as GuruLogin } from "@/pages/guru/Login"
import { Dashboard as GuruDashboard } from "@/pages/guru/Dashboard"
import { Profil as GuruProfil } from "@/pages/guru/Profil"
import { Kelas as GuruKelas } from "@/pages/guru/Kelas"
import { KelasDetail as GuruKelasDetail } from "@/pages/guru/KelasDetail"
import { Murid as GuruMurid } from "@/pages/guru/Murid"
import { Permintaan as GuruPermintaan } from "@/pages/guru/Permintaan"
import { MateriList as GuruMateriList } from "@/pages/guru/MateriList"
import { MateriEdit as GuruMateriEdit } from "@/pages/guru/MateriEdit"
import { KuisList as GuruKuisList } from "@/pages/guru/KuisList"
import { KuisEdit as GuruKuisEdit } from "@/pages/guru/KuisEdit"
import { KuisHasil as GuruKuisHasil } from "@/pages/guru/KuisHasil"
import { Progres as GuruProgres } from "@/pages/guru/Progres"

// Murid Pages
import { Dashboard as MuridDashboard } from "@/pages/murid/Dashboard"
import { KuisKerjakan as MuridKuisKerjakan } from "@/pages/murid/KuisKerjakan"
import { Hasil as MuridHasil } from "@/pages/murid/Hasil"
import { Riwayat as MuridRiwayat } from "@/pages/murid/Riwayat"
import { Profil as MuridProfil } from "@/pages/murid/Profil"

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Rute Publik */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Beranda />} />
          <Route path="/mading" element={<Mading />} />
          <Route
            path="/materi/:slug"
            element={
              <ProtectedRoute>
                <MateriDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/masuk" element={<Masuk />} />
          <Route
            path="/aktivasi"
            element={
              <ProtectedRoute>
                <Aktivasi />
              </ProtectedRoute>
            }
          />
          <Route path="/guru/login" element={<GuruLogin />} />
        </Route>

        {/* Rute Guru (Protected: guru) */}
        <Route
          path="/guru"
          element={
            <ProtectedRoute allowedRoles={["guru"]}>
              <GuruLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<GuruDashboard />} />
          <Route path="mading" element={<Mading />} />
          <Route path="profil" element={<GuruProfil />} />
          <Route path="kelas" element={<GuruKelas />} />
          <Route path="kelas/:id" element={<GuruKelasDetail />} />
          <Route path="murid" element={<GuruMurid />} />
          <Route path="permintaan" element={<GuruPermintaan />} />
          <Route path="materi" element={<GuruMateriList />} />
          <Route path="materi/baru" element={<GuruMateriEdit />} />
          <Route path="materi/:id/edit" element={<GuruMateriEdit />} />
          <Route path="kuis" element={<GuruKuisList />} />
          <Route path="kuis/baru" element={<GuruKuisEdit />} />
          <Route path="kuis/:id/edit" element={<GuruKuisEdit />} />
          <Route path="kuis/:id/hasil" element={<GuruKuisHasil />} />
          <Route path="progres" element={<GuruProgres />} />
        </Route>

        {/* Rute Murid (Protected: murid) */}
        <Route
          path="/murid"
          element={
            <ProtectedRoute allowedRoles={["murid"]}>
              <MuridLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MuridDashboard />} />
          <Route path="mading" element={<Mading />} />
          <Route path="kuis/:id" element={<MuridKuisKerjakan />} />
          <Route path="hasil/:percobaanId" element={<MuridHasil />} />
          <Route path="riwayat" element={<MuridRiwayat />} />
          <Route path="profil" element={<MuridProfil />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

