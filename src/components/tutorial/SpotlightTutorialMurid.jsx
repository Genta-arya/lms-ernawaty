import React, { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useLocation, useNavigate } from "react-router-dom"
import {
  User,
  Megaphone,
  LayoutGrid,
  BookOpen,
  ClipboardList,
  Trophy,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Compass,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "lsm_murid_spotlight_dismiss_date"
const LEGACY_STORAGE_KEY = "lsm_spotlight_tutorial_dismissed_today"

export function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const date = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${date}`
}

export function isTutorialDismissedToday() {
  try {
    const today = getTodayDateString()
    const saved = localStorage.getItem(STORAGE_KEY)
    const savedLegacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    const sessionDismissed = sessionStorage.getItem(STORAGE_KEY)

    // Jika sudah di-dismiss hari ini di salah satu storage, jangan buka otomatis lagi
    if (saved === today || savedLegacy === today || sessionDismissed === today) {
      return true
    }
    return false
  } catch {
    return false
  }
}

export function setTutorialDismissedToday() {
  try {
    const today = getTodayDateString()
    localStorage.setItem(STORAGE_KEY, today)
    localStorage.setItem(LEGACY_STORAGE_KEY, today)
    sessionStorage.setItem(STORAGE_KEY, today)
  } catch (err) {
    console.warn("Gagal simpan tanggal tutorial:", err)
    try {
      sessionStorage.setItem(STORAGE_KEY, getTodayDateString())
    } catch (_) { }
  }
}

export function resetTutorialDate() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.warn("Gagal reset tanggal tutorial:", err)
  }
}

const STEPS = [
  {
    id: "profile",
    selector: '[data-tour="murid-profile"]',
    title: "Identitas & Ringkasan Belajar",
    badge: "1 dari 6",
    icon: User,
    iconColor: "from-blue-500 to-indigo-600",
    description:
      "Pantau status kelasmu, NISN terverifikasi dari sekolah, dan akumulasi jumlah kuis formatif yang telah kamu kerjakan dengan sukses.",
    tips: "Ketuk avatar atau namamu untuk membuka halaman Profil dan memperbarui foto akun.",
  },
  {
    id: "pengumuman",
    selector: '[data-tour="murid-pengumuman"]',
    title: "Papan Pengumuman Sekolah",
    badge: "2 dari 6",
    icon: Megaphone,
    iconColor: "from-rose-500 to-amber-500",
    description:
      "Informasi mendesak, jadwal tatap muka virtual, serta pengumuman penting dari Ibu Guru disiarkan secara real-time di sini.",
    tips: "Pengumuman berwarna merah adalah siaran prioritas penting yang wajib kamu cermati.",
  },
  {
    id: "quickmenu",
    selector: '[data-tour="murid-quickmenu"]',
    title: "Menu Utama & Akses Cepat",
    badge: "3 dari 6",
    icon: LayoutGrid,
    iconColor: "from-blue-600 to-cyan-500",
    description:
      "Akses kilat ke modul Materi Pembelajaran, Penugasan Siswa, Pojok Kreasi Mading, Riwayat Belajar, dan Ruang Kelas.",
    tips: "Bilah navigasi di bagian bawah ponsel juga siap membantumu berpindah menu kapan pun.",
  },
  {
    id: "materi",
    selector: '[data-tour="murid-materi"]',
    title: "Modul Materi & Kuis Interaktif",
    badge: "4 dari 6",
    icon: BookOpen,
    iconColor: "from-emerald-500 to-teal-600",
    description:
      "Baca modul Bahasa Indonesia berstandar Kurikulum Merdeka. Tuntaskan bacaan untuk membuka kuis formatif latihan dengan countdown otomatis.",
    tips: "Setiap selesai membaca, sistem otomatis mencatat progres tuntas belajarmu ke guru.",
  },
  {
    id: "tugas",
    selector: '[data-tour="murid-tugas"]',
    title: "Penugasan & Pengumpulan Berkas",
    badge: "5 dari 6",
    icon: ClipboardList,
    iconColor: "from-amber-500 to-orange-600",
    description:
      "Periksa instruksi tugas, batas waktu pengumpulan (deadline), dan unggah berkas jawabanmu secara langsung untuk dinilai guru.",
    tips: "Cek umpan balik dan nilai langsung di halaman detail tugas setelah guru menilainya.",
  },
  {
    id: "leaderboard",
    selector: '[data-tour="murid-leaderboard"]',
    title: "Peringkat Kelas & Pojok Kreasi",
    badge: "6 dari 6",
    icon: Trophy,
    iconColor: "from-amber-400 to-yellow-600",
    description:
      "Lihat posisi peringkat skor kuis harian di Leaderboard kelas, serta bagikan karya puisi, pantun, dan cerpenmu di Pojok Kreasi Mading.",
    tips: "Raih skor 100 pada kuis latihan untuk memuncaki papan peringkat kelas!",
  },
]

export function SpotlightTutorialMurid() {
  const location = useLocation()
  const navigate = useNavigate()
  const cardRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const [dontShowTodayChecked, setDontShowTodayChecked] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isPillDismissed, setIsPillDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Cek apakah tutorial otomatis dibuka saat berada di halaman murid
  useEffect(() => {
    if (!mounted) return
    const isDashboard = location.pathname === "/murid" || location.pathname === "/murid/"
    if (!isDashboard) return

    // Jika belum di-dismiss hari ini, tampilkan otomatis dengan sedikit delay agar UI stabil
    if (!isTutorialDismissedToday()) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        setCurrentStepIndex(0)
      }, 900)
      return () => clearTimeout(timer)
    }
  }, [mounted, location.pathname])

  // CATATAN: Penguncian body overflow sengaja DIHAPUS agar murid bebas melakukan scroll
  // baik pada halaman maupun di dalam modal spotlight saat tutorial berlangsung.

  // Helper cek apakah elemen visible di viewport (bukan hidden / display: none)
  const isElementVisible = (el) => {
    if (!el) return false
    const style = window.getComputedStyle(el)
    return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null
  }

  // Hitung posisi elemen target saat step berganti & perbarui saat scroll
  useEffect(() => {
    if (!isOpen) {
      setTargetRect(null)
      return
    }

    const currentStep = STEPS[currentStepIndex]
    if (!currentStep) return

    let element = currentStep.selector ? document.querySelector(currentStep.selector) : null

    // Fallback jika elemen mobile / desktop berbeda atau elemen belum terbit
    if (!isElementVisible(element)) {
      if (currentStep.id === "quickmenu" || currentStep.id === "materi" || currentStep.id === "tugas") {
        const quickMenuEl = document.querySelector('[data-tour="murid-quickmenu"]')
        const materiEl = document.querySelector('[data-tour="murid-materi"]')
        if (isElementVisible(quickMenuEl)) {
          element = quickMenuEl
        } else if (isElementVisible(materiEl)) {
          element = materiEl
        }
      } else if (currentStep.id === "pengumuman") {
        element = document.querySelector('[data-tour="murid-profile"]')
      }
    }

    if (element && isElementVisible(element)) {
      // Scroll target ke tengah layar secara mulus
      try {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      } catch (err) {
        // Fallback jika scrollIntoView opsi tidak didukung penuh
        element.scrollIntoView()
      }

      // Ambil bounding rect setelah transisi scroll
      const updatePosition = () => {
        if (!element) return
        const rect = element.getBoundingClientRect()
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        })
      }

      updatePosition()
      const scrollTimer = setTimeout(updatePosition, 350)
      window.addEventListener("resize", updatePosition, { passive: true })
      window.addEventListener("scroll", updatePosition, { passive: true })

      return () => {
        clearTimeout(scrollTimer)
        window.removeEventListener("resize", updatePosition)
        window.removeEventListener("scroll", updatePosition)
      }
    } else {
      setTargetRect(null)
    }
  }, [isOpen, currentStepIndex])

  // Tangani klik di luar modal (backdrop tap) tanpa memblokir gesture swipe/scroll
  useEffect(() => {
    if (!isOpen) return

    let startX = 0
    let startY = 0
    let isScrollDrag = false

    function onPointerDown(e) {
      startX = e.clientX
      startY = e.clientY
      isScrollDrag = false
    }

    function onPointerMove(e) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 10) {
        isScrollDrag = true
      }
    }

    function onClickCapture(e) {
      // Jika klik berada di dalam kartu dialog spotlight, biarkan tombol & kontrol beraksi normal
      if (cardRef.current && cardRef.current.contains(e.target)) {
        return
      }

      // Jika pengguna sedang melakukan scroll/swipe di layar, jangan batalkan dan jangan dismiss
      if (isScrollDrag) {
        return
      }

      // Jika murni tap ringan di luar kartu, tutup panduan hari ini & hentikan event tembus
      e.preventDefault()
      e.stopPropagation()
      handleDismiss()
    }

    window.addEventListener("pointerdown", onPointerDown, { passive: true })
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("click", onClickCapture, { capture: true })

    return () => {
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("click", onClickCapture, { capture: true })
    }
  }, [isOpen, dontShowTodayChecked])

  // Navigasi keyboard (Panah Kiri, Panah Kanan, Escape)
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        handleDismiss()
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if (e.key === "ArrowLeft") {
        handlePrev()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, currentStepIndex, dontShowTodayChecked])

  function handleDismiss() {
    // Jika dicentang atau ditutup biasa, simpan supresi hari ini
    if (dontShowTodayChecked) {
      setTutorialDismissedToday()
    }
    setIsOpen(false)
  }

  function handleFinish() {
    // Selesai selalu menandai tutorial telah dituntaskan hari ini
    setTutorialDismissedToday()
    setIsOpen(false)
  }

  function handleNext() {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    } else {
      handleFinish()
    }
  }

  function handlePrev() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  function handleManualStart() {
    if (location.pathname !== "/murid" && location.pathname !== "/murid/") {
      navigate("/murid")
      setTimeout(() => {
        setCurrentStepIndex(0)
        setIsOpen(true)
      }, 500)
    } else {
      setCurrentStepIndex(0)
      setIsOpen(true)
    }
  }

  useEffect(() => {
    function onOpenEvent() {
      handleManualStart()
    }
    window.addEventListener("lsm-open-tutorial", onOpenEvent)
    return () => window.removeEventListener("lsm-open-tutorial", onOpenEvent)
  }, [location.pathname])

  const currentStep = STEPS[currentStepIndex]
  const IconComponent = currentStep?.icon || Compass

  // Hitung posisi tooltip card secara adaptif
  const padding = 10
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640
  const isTargetInLowerHalf =
    targetRect && typeof window !== "undefined"
      ? targetRect.top > window.innerHeight / 2
      : false

  let tooltipStyle = {}
  if (!isMobile && targetRect) {
    const spaceBelow = window.innerHeight - (targetRect.bottom + padding)
    const spaceAbove = targetRect.top - padding

    // Jika ruang di bawah cukup (> 300px), letakkan di bawah target
    if (spaceBelow >= 300 || spaceBelow >= spaceAbove) {
      const topPos = Math.min(window.innerHeight - 380, targetRect.bottom + padding + 12)
      const leftPos = Math.max(16, Math.min(window.innerWidth - 440, targetRect.left))
      tooltipStyle = {
        top: `${Math.max(16, topPos)}px`,
        left: `${leftPos}px`,
      }
    } else {
      // Letakkan di atas target
      const topPos = Math.max(16, targetRect.top - padding - 360)
      const leftPos = Math.max(16, Math.min(window.innerWidth - 440, targetRect.left))
      tooltipStyle = {
        top: `${topPos}px`,
        left: `${leftPos}px`,
      }
    }
  }

  return (
    <>
      {/* ── TOMBOL FLOATING PEMICU TUTORIAL MANUAL (Mobile: Kanan Bawah di Atas BottomNav dengan Tombol X) ── */}
      {!isPillDismissed && (
        <div className="fixed bottom-24 md:bottom-6 right-4 md:right-auto md:left-4 z-40 pointer-events-auto flex items-center shadow-lg rounded-full bg-white/95 hover:bg-white border border-slate-200/90 backdrop-blur-md p-0.5 transition-all animate-in fade-in slide-in-from-bottom-3 duration-300">
          <button
            type="button"
            onClick={handleManualStart}
            title="Buka Panduan Tutorial Siswa"
            className="group flex items-center gap-2 pl-2 pr-2.5 py-1.5 text-slate-700 hover:text-blue-600 text-xs font-bold transition-all active:scale-95"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:rotate-12 transition-transform">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline">Panduan LMS</span>
            <span className="sm:hidden text-[11px]">Tutorial</span>
          </button>

          {/* Tombol X untuk menutup pill tutorial jika mengganggu pandangan */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsPillDismissed(true)
            }}
            title="Sembunyikan tombol tutorial"
            className="w-5 h-5 mr-1 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── SPOTLIGHT OVERLAY MENGGUNAKAN PORTAL KE BODY ── */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Panduan Interaktif Siswa"
            className="fixed inset-0 w-full h-full min-h-[100dvh] z-[999999] pointer-events-none animate-in fade-in duration-300"
          >
            {/* SVG MASK MENGHASILKAN SPOTLIGHT CUTOUT TRANSPARAN */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300"
              style={{ width: "100vw", height: "100vh" }}
            >
              <defs>
                <mask id="lsm-spotlight-mask">
                  {/* Seluruh layar gelap */}
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {/* Lubang transparan tepat di target elemen */}
                  {targetRect && (
                    <rect
                      x={Math.max(0, targetRect.left - padding)}
                      y={Math.max(0, targetRect.top - padding)}
                      width={targetRect.width + padding * 2}
                      height={targetRect.height + padding * 2}
                      rx="18"
                      ry="18"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>

              {/* Latar Belakang Gelap Semi-Transparan dengan Mask */}
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(15, 23, 42, 0.82)"
                mask="url(#lsm-spotlight-mask)"
                className="backdrop-blur-[2.5px]"
              />
            </svg>

            {/* BINGKAI CAHAYA MENYALA DI SEKITAR TARGET ELEMENT */}
            {targetRect && (
              <div
                style={{
                  position: "fixed",
                  top: `${Math.max(0, targetRect.top - padding)}px`,
                  left: `${Math.max(0, targetRect.left - padding)}px`,
                  width: `${targetRect.width + padding * 2}px`,
                  height: `${targetRect.height + padding * 2}px`,
                }}
                className="rounded-2xl border-2 border-blue-400 shadow-[0_0_35px_rgba(59,130,246,0.65)] pointer-events-none z-20 transition-all duration-300 ease-out animate-pulse"
              />
            )}

            {/* KARTU DIALOG SPOTLIGHT (TOOLTIP) DENGAN AUTO-FLIP & OVERFLOW SCROLL */}
            <div
              ref={cardRef}
              style={!isMobile && targetRect ? tooltipStyle : {}}
              className={`z-30 pointer-events-auto transition-all duration-300 ease-out ${isMobile || !targetRect
                  ? isTargetInLowerHalf
                    ? "fixed top-3 sm:top-5 left-3 sm:left-4 right-3 sm:right-4 max-w-md mx-auto"
                    : "fixed bottom-3 sm:bottom-6 left-3 sm:left-4 right-3 sm:right-4 max-w-md mx-auto"
                  : "fixed w-[420px] max-w-[calc(100vw-32px)]"
                }`}
            >
              <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-slate-200/90 text-slate-800 flex flex-col max-h-[min(540px,78dvh)] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* 1. Header Kartu (Sticky / Shrink-0) */}
                <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0 bg-white rounded-t-3xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr ${currentStep.iconColor} text-white flex items-center justify-center shrink-0 shadow-md`}
                    >
                      <IconComponent className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                          Panduan Belajar
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {currentStep.badge}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-0.5">
                        {currentStep.title}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    title="Tutup panduan hari ini"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. Isi Konten dengan Flex-1 Min-H-0 + Overflow-Y Auto + Touch-Pan-Y */}
                <div
                  style={{ WebkitOverflowScrolling: "touch" }}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:p-5 space-y-3.5 focus:outline-none scrollbar-thin scrollbar-thumb-slate-200"
                >
                  {/* Deskripsi Langkah */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                    {currentStep.description}
                  </p>

                  {/* Tips Cepat */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">Tips: </span>
                      <span>{currentStep.tips}</span>
                    </div>
                  </div>

                  {/* Indikator Bar Progress Dots */}
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {STEPS.map((step, idx) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setCurrentStepIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStepIndex
                            ? "w-7 bg-blue-600"
                            : idx < currentStepIndex
                              ? "w-2.5 bg-blue-300"
                              : "w-1.5 bg-slate-200"
                          }`}
                        title={`Langkah ${idx + 1}: ${step.title}`}
                      />
                    ))}
                  </div>

                  {/* Pengaturan "Jangan tampilkan lagi hari ini" */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] text-slate-500">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={dontShowTodayChecked}
                        onChange={(e) => setDontShowTodayChecked(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Jangan tampilkan lagi hari ini</span>
                    </label>
                  </div>
                </div>

                {/* 3. Footer Tombol Aksi (Sticky / Tidak terpotong) */}
                <div className="p-3 sm:p-4 px-4 sm:px-5 border-t border-slate-100 bg-slate-50/80 rounded-b-3xl flex items-center justify-between gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-xl transition-colors"
                  >
                    Lewati
                  </button>

                  <div className="flex items-center gap-2">
                    {currentStepIndex > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePrev}
                        className="rounded-xl text-xs font-bold h-9 px-3 gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Sebelumnya</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleNext}
                      className="rounded-xl text-xs font-black h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 gap-1.5"
                    >
                      <span>
                        {currentStepIndex === STEPS.length - 1 ? "Selesai" : "Lanjut"}
                      </span>
                      {currentStepIndex === STEPS.length - 1 ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
