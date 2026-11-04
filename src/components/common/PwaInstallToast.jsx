import React, { useState, useEffect } from "react"
import { Download, X, Smartphone, Tablet } from "lucide-react"

/**
 * PwaInstallToast
 * Menampilkan toast ajakan install PWA khusus untuk perangkat mobile (khususnya Android).
 * Posisi:
 * - HP (< 768px): Atas Tengah (top-3 left-1/2 -translate-x-1/2)
 * - Tablet (>= 768px & < 1024px atau tablet mode): Kiri Atas (top-4 left-4 md:translate-x-0)
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

    // 2. Cek apakah user sudah pernah menutup toast baru-baru ini (simpan 2 hari)
    const dismissedUntil = localStorage.getItem("pwa_toast_dismissed_until")
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return
    }

    // 3. Deteksi apakah perangkat adalah tablet atau HP
    const checkDevice = () => {
      const width = window.innerWidth
      // Tablet tipikal 640px s.d 1024px
      const tabletQuery = width >= 640 && width <= 1024
      setIsTablet(tabletQuery)
    }

    checkDevice()
    window.addEventListener("resize", checkDevice)

    // 4. Deteksi apakah user agent adalah Android atau Mobile
    const ua = navigator.userAgent || ""
    const isAndroid = /Android/i.test(ua)
    const isMobileDevice = /Mobile|Android|iP(hone|od|ad)/i.test(ua) || window.innerWidth < 1024

    // 5. Tangkap event 'beforeinstallprompt' dari browser Chrome/Chromium Android
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowToast(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Fallback khusus Android jika event beforeinstallprompt lambat / belum dipicu
    // namun kita ingin memberi tahu bahwa web ini bisa diinstall ke layar utama
    let fallbackTimer = null
    if (isAndroid || isMobileDevice) {
      fallbackTimer = setTimeout(() => {
        // Tampilkan jika belum pernah ditutup
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
        console.error("Gagal memicu install PWA:", err)
      } finally {
        setIsInstalling(false)
        setDeferredPrompt(null)
      }
    } else {
      // Petunjuk instruksi jika sebeluminstallprompt belum siap di browser tertentu
      alert("Untuk memasang aplikasi ke layar utama:\n1. Ketuk ikon titik tiga (⋮) di pojok kanan atas browser\n2. Pilih 'Tambahkan ke Layar Utama' atau 'Instal Aplikasi'")
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    setShowToast(false)
    // Tunda penayangan ulang selama 2 hari
    localStorage.setItem(
      "pwa_toast_dismissed_until",
      String(Date.now() + 2 * 24 * 60 * 60 * 1000)
    )
  }

  if (!showToast) return null

  return (
    <aside
      aria-label="Pemasangan Aplikasi PWA"
      className={`fixed z-[999999] transition-all duration-300 animate-in fade-in slide-in-from-top-4 px-3 sm:px-0 pointer-events-auto ${
        isTablet
          ? "top-4 left-4 max-w-sm w-full"
          : "top-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md"
      }`}
    >
      <div className="bg-slate-900/95 text-white backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-2xl flex items-center gap-3">
        {/* Ikon Aplikasi / PWA */}
        <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0 text-blue-400">
          {isTablet ? <Tablet className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
        </div>

        {/* Info Teks */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
              PWA App
            </span>
            <span className="text-[11px] text-slate-400">SMPN 3 Ketapang</span>
          </div>
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-100 tracking-tight leading-snug mt-0.5 truncate">
            Pasang Aplikasi di {isTablet ? "Tablet" : "HP"}
          </h4>
          <p className="text-[11px] text-slate-300 leading-tight line-clamp-1">
            Akses lebih cepat & tanpa alamat web browser
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3 py-2 rounded-xl text-xs font-black shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstalling ? "Memasang..." : "Pasang"}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            aria-label="Tutup notifikasi pasang aplikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
