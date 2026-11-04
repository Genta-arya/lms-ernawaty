import React, { useState, useEffect } from "react"
import { Download, X } from "lucide-react"

/**
 * PwaInstallToast
 * Toast ajakan pasang aplikasi PWA yang super simpel, ramping, dan modern (ala Dynamic Island / minimal pill).
 * Posisi:
 * - HP (< 640px): Atas Tengah (top-2.5 left-1/2 -translate-x-1/2) dengan pill super kompak
 * - Tablet (>= 640px): Kiri Atas (top-4 left-4)
 */
export function PwaInstallToast() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showToast, setShowToast] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    // 1. Cek apakah sudah berjalan di mode PWA (standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://")

    if (isStandalone) {
      return
    }

    // 2. Cek dismissal preferensi (simpan 2 hari)
    const dismissedUntil = localStorage.getItem("pwa_toast_dismissed_until")
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return
    }

    // 3. Deteksi ukuran perangkat
    const checkDevice = () => {
      const width = window.innerWidth
      setIsTablet(width >= 640 && width <= 1024)
    }

    checkDevice()
    window.addEventListener("resize", checkDevice)

    // 4. Deteksi user agent mobile
    const ua = navigator.userAgent || ""
    const isAndroid = /Android/i.test(ua)
    const isMobileDevice = /Mobile|Android|iP(hone|od|ad)/i.test(ua) || window.innerWidth < 1024

    // 5. Tangkap event 'beforeinstallprompt' dari Chromium Android
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowToast(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Fallback otomatis jika di mobile belum terpicu event
    let fallbackTimer = null
    if (isAndroid || isMobileDevice) {
      fallbackTimer = setTimeout(() => {
        if (!localStorage.getItem("pwa_toast_dismissed_until")) {
          setShowToast(true)
        }
      }, 2500)
    }

    return () => {
      window.removeEventListener("resize", checkDevice)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setIsInstalling(true)
      try {
        await deferredPrompt.prompt()
        const choiceResult = await deferredPrompt.userChoice
        if (choiceResult.outcome === "accepted") {
          setShowToast(false)
        }
      } catch (err) {
        console.error("Gagal install PWA:", err)
      } finally {
        setIsInstalling(false)
        setDeferredPrompt(null)
      }
    } else {
      alert("Untuk memasang aplikasi ke layar utama:\n1. Ketuk menu titik tiga (⋮) di browser\n2. Pilih 'Tambahkan ke Layar Utama' atau 'Instal Aplikasi'")
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    setShowToast(false)
    localStorage.setItem(
      "pwa_toast_dismissed_until",
      String(Date.now() + 2 * 24 * 60 * 60 * 1000)
    )
  }

  if (!showToast) return null

  return (
    <aside
      aria-label="Pasang Aplikasi PWA"
      className={`fixed z-[999999] transition-all duration-300 animate-in fade-in slide-in-from-top-3 pointer-events-auto ${
        isTablet
          ? "top-4 left-4 max-w-xs w-auto"
          : "top-2.5 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-sm"
      }`}
    >
      {/* Pill Minimalis Ramping ala Dynamic Island */}
      <div className="bg-slate-900/95 text-white backdrop-blur-xl border border-slate-700/60 rounded-full px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-xl shadow-slate-950/40 flex items-center justify-between gap-2.5">
        {/* Logo Sekolah & Teks Ramping Singkat */}
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/logo.png"
            alt="Logo LMS"
            className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white/20"
          />
          <div className="min-w-0 pr-1">
            <h4 className="text-[12px] font-bold text-white leading-tight truncate">
              Pasang LMS SMPN 3
            </h4>
            <p className="text-[10px] text-slate-300 leading-none truncate">
              Akses cepat tanpa browser
            </p>
          </div>
        </div>

        {/* Tombol Pasang & Close Ringkas */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>{isInstalling ? "..." : "Pasang"}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
