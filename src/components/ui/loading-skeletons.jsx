import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { TableRow, TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { BookOpen, FileQuestion, LayoutDashboard, Feather, Award, Clock, Sparkles } from "lucide-react"

/* ─────────────────────────────────────────────
 *  Lottie-style branded loading spinner
 * ───────────────────────────────────────────── */
function LoadingDots({ label = "Memuat data…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-blue-500"
            style={{
              animation: "dotBounce 1s ease-in-out infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <span className="text-xs text-slate-400 font-medium tracking-wide">{label}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────
 *  Auth Splash Screen (Digunakan oleh ProtectedRoute)
 * ───────────────────────────────────────────── */
function AuthSplashScreen({ message = "Memvalidasi sesi belajar..." }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50/50 via-white to-slate-50 px-4">
      <div className="flex flex-col items-center text-center space-y-5 max-w-sm">
        {/* Logo Container with Ambient Glow */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-3xl bg-white p-3 shadow-xl border border-blue-100 flex items-center justify-center relative z-10"
            style={{ animation: "pulseGlow 2.5s ease-in-out infinite" }}
          >
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkMwdy4_7y48uzPnbFyQIzELTIrQTUGMHfofMTkNenIM_ExEml_YBWl275&s=10"
              alt="Logo SMPN 3 Ketapang"
              className="w-14 h-14 object-contain"
            />
          </div>
          {/* Animated Glow Ring */}
          <div className="absolute inset-0 rounded-3xl bg-blue-400/20 blur-xl animate-ping opacity-60" />
        </div>

        {/* Brand Title */}
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight">
            SMPN 3 Ketapang
          </h2>
          <p className="text-xs text-blue-600 font-semibold flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            LMS Mandiri Kurikulum Merdeka
          </p>
        </div>

        {/* Dot Bouncing Indicator */}
        <LoadingDots label={message} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
 *  Table Rows Skeleton (Semantic for <tbody>)
 * ───────────────────────────────────────────── */
function TableRowsLoading({ rows = 4, cols = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <TableRow key={rIdx} className="hover:bg-transparent">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <TableCell key={cIdx} className="py-4">
              <Skeleton
                className={cn(
                  "h-4",
                  cIdx === 0
                    ? "w-12"
                    : cIdx === 1
                    ? "w-40 sm:w-56"
                    : cIdx === cols - 1
                    ? "w-20 ml-auto"
                    : "w-24"
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

/* ─────────────────────────────────────────────
 *  Hero Banner Skeleton (Beranda / Dashboard)
 * ───────────────────────────────────────────── */
function HeroBannerSkeleton({ variant = "beranda" }) {
  const isGuru = variant === "guru"
  return (
    <div
      className={cn(
        "rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden",
        isGuru
          ? "bg-gradient-to-r from-slate-800 to-slate-700"
          : "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-200/50"
      )}
    >
      <div className="space-y-3">
        <Skeleton className="h-5 w-36 rounded-full bg-white/20" />
        <Skeleton className="h-8 w-64 sm:w-80 bg-white/25" />
        <div className="flex gap-3 mt-2">
          <Skeleton className="h-4 w-24 bg-white/15" />
          <Skeleton className="h-4 w-28 bg-white/15" />
          <Skeleton className="h-4 w-32 bg-white/15" />
        </div>
      </div>
      {/* Decorative floating icon */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10">
        {isGuru ? (
          <LayoutDashboard className="w-20 h-20 text-white" />
        ) : (
          <BookOpen className="w-20 h-20 text-blue-600" />
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
 *  Stat Card Skeleton Row
 * ───────────────────────────────────────────── */
function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-2.5"
          style={{
            animation: "skeletonFadeIn 0.4s ease-out both",
            animationDelay: `${i * 80}ms`,
          }}
        >
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
 *  Materi Card Skeleton
 * ───────────────────────────────────────────── */
function MateriCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
      {/* Thumbnail placeholder */}
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
 *  Kuis Card Skeleton
 * ───────────────────────────────────────────── */
function KuisCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
        </div>
        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  )
}

/* ─────────────────────────────────────────────
 *  Mading / Karya Card Skeleton
 * ───────────────────────────────────────────── */
function MadingCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Author row */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        {/* Content */}
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        {/* Actions row */}
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
 *  Table Row Skeleton (Guru pages: Murid list, Progres, Permintaan)
 * ───────────────────────────────────────────── */
function TableRowSkeleton({ cols = 5 }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === 0 ? "w-10" : i === 1 ? "w-32 flex-1" : "w-20")}
        />
      ))}
    </div>
  )
}

function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden skeleton-stagger">
      {/* Table header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-slate-50/80 border-b border-slate-200">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-3", i === 0 ? "w-8" : i === 1 ? "w-24 flex-1" : "w-16")}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
 *  Detail Page Skeleton (MateriDetail / KuisKerjakan / Hasil)
 * ───────────────────────────────────────────── */
function DetailPageSkeleton({ icon: Icon = BookOpen, label = "Memuat konten…" }) {
  return (
    <div className="container max-w-4xl py-12">
      <div className="flex flex-col items-center justify-center gap-4 mb-8">
        <div
          className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center"
          style={{ animation: "pulseGlow 2s ease-in-out infinite" }}
        >
          <Icon className="w-7 h-7 text-blue-500" />
        </div>
        <LoadingDots label={label} />
      </div>
      <div className="space-y-6 skeleton-stagger">
        {/* Breadcrumb */}
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-28" />
        </div>
        {/* Title area */}
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        {/* Content blocks */}
        <div className="space-y-4 pt-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
 *  Full-Page Branded Loader (untuk halaman utama)
 * ───────────────────────────────────────────── */
function FullPageLoader({ icon: Icon = BookOpen, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="relative">
        <div
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200/50 flex items-center justify-center shadow-lg shadow-blue-500/10"
          style={{ animation: "pulseGlow 2s ease-in-out infinite" }}
        >
          <Icon className="w-8 h-8 text-blue-600" />
        </div>
        {/* Orbiting dot */}
        <span
          className="absolute w-2 h-2 rounded-full bg-blue-400"
          style={{
            top: "-4px",
            right: "-4px",
            animation: "pulseGlow 1.5s ease-in-out infinite 0.3s",
          }}
        />
      </div>
      {title && (
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-slate-700">{title}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      )}
      <LoadingDots />
    </div>
  )
}

/* ─────────────────────────────────────────────
 *  HALAMAN KHUSUS — Skeleton Lengkap per Halaman
 * ───────────────────────────────────────────── */

/** Beranda Loading */
function BerandaSkeleton() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto skeleton-stagger">
      <HeroBannerSkeleton variant="beranda" />
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-white p-4 space-y-2"
            style={{
              animation: "skeletonFadeIn 0.4s ease-out both",
              animationDelay: `${i * 80}ms`,
            }}
          >
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      {/* Tab pills */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      {/* Materi Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              animation: "skeletonFadeIn 0.4s ease-out both",
              animationDelay: `${(i + 4) * 80}ms`,
            }}
          >
            <MateriCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Dashboard Murid / Siswa Loading */
function DashboardMuridSkeleton() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto skeleton-stagger">
      <HeroBannerSkeleton variant="murid" />
      {/* Info banner */}
      <Skeleton className="h-12 w-full rounded-xl" />
      {/* Materi section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                animation: "skeletonFadeIn 0.4s ease-out both",
                animationDelay: `${i * 100}ms`,
              }}
            >
              <MateriCardSkeleton />
            </div>
          ))}
        </div>
      </div>
      {/* Kuis section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                animation: "skeletonFadeIn 0.4s ease-out both",
                animationDelay: `${(i + 4) * 100}ms`,
              }}
            >
              <KuisCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Mading / Pojok Kreasi Loading */
function MadingSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto skeleton-stagger">
      {/* Header */}
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      {/* Create post bar */}
      <Skeleton className="h-14 w-full rounded-xl" />
      {/* Filter tabs */}
      <div className="flex gap-2 justify-center">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      {/* Cards */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            animation: "skeletonFadeIn 0.4s ease-out both",
            animationDelay: `${i * 120}ms`,
          }}
        >
          <MadingCardSkeleton />
        </div>
      ))}
    </div>
  )
}

/** Dashboard Guru Loading */
function DashboardGuruSkeleton() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto skeleton-stagger">
      <HeroBannerSkeleton variant="guru" />
      <StatCardsSkeleton count={4} />
      {/* Recent items table */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <TableSkeleton rows={4} cols={4} />
      </div>
    </div>
  )
}

/** Riwayat Kuis Loading */
function RiwayatSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto skeleton-stagger">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-full rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl border bg-white p-4 flex items-center gap-4"
          style={{
            animation: "skeletonFadeIn 0.4s ease-out both",
            animationDelay: `${i * 80}ms`,
          }}
        >
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** Aktivasi / Klaim Loading */
function AktivasiSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      <div
        className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/50 flex items-center justify-center"
        style={{ animation: "pulseGlow 2s ease-in-out infinite" }}
      >
        <Award className="w-7 h-7 text-blue-500" />
      </div>
      <LoadingDots label="Memuat status aktivasi…" />
    </div>
  )
}

/** Guru Profil Loading */
function ProfilSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto skeleton-stagger">
      {/* Avatar & name */}
      <div className="flex flex-col items-center gap-3 py-6">
        <Skeleton className="w-20 h-20 rounded-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
      {/* Form fields */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="space-y-2"
          style={{
            animation: "skeletonFadeIn 0.4s ease-out both",
            animationDelay: `${i * 80}ms`,
          }}
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}

/** Permintaan / Klaim List Loading */
function PermintaanSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto skeleton-stagger">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border bg-white p-4 flex items-center gap-4"
          style={{
            animation: "skeletonFadeIn 0.4s ease-out both",
            animationDelay: `${i * 80}ms`,
          }}
        >
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Progres Murid Loading (Guru view) */
function ProgresSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto skeleton-stagger">
      <div className="space-y-1">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-full max-w-xs rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <TableSkeleton rows={6} cols={5} />
    </div>
  )
}

/** Murid List Loading (Guru view) */
function MuridListSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto skeleton-stagger">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <TableSkeleton rows={6} cols={4} />
    </div>
  )
}

/** Form Edit Loading (KuisEdit / MateriEdit) */
function FormEditSkeleton({ icon: Icon = FileQuestion }) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto skeleton-stagger">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="space-y-2"
          style={{
            animation: "skeletonFadeIn 0.4s ease-out both",
            animationDelay: `${i * 80}ms`,
          }}
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className={cn("h-10 w-full rounded-lg", i === 2 && "h-32")} />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  )
}

export {
  Skeleton,
  LoadingDots,
  HeroBannerSkeleton,
  StatCardsSkeleton,
  MateriCardSkeleton,
  KuisCardSkeleton,
  MadingCardSkeleton,
  TableSkeleton,
  TableRowSkeleton,
  TableRowsLoading,
  DetailPageSkeleton,
  FullPageLoader,
  AuthSplashScreen,
  // Halaman khusus
  BerandaSkeleton,
  DashboardMuridSkeleton,
  MadingSkeleton,
  DashboardGuruSkeleton,
  RiwayatSkeleton,
  AktivasiSkeleton,
  ProfilSkeleton,
  PermintaanSkeleton,
  ProgresSkeleton,
  MuridListSkeleton,
  FormEditSkeleton,
}

