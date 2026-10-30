import React, { useState, useEffect, useRef, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import {
  Megaphone,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Calendar,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react"

export function PengumumanCarousel({ announcements = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [detailModal, setDetailModal] = useState(null) // pengumuman yang sedang dibuka full modalnya
  const touchStartX = useRef(null)
  const touchEndX = useRef(null)

  const total = announcements.length

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total)
  }, [total])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total)
  }, [total])

  // Auto-slide setiap 7 detik jika tidak sedang di-pause dan modal detail tidak dibuka
  useEffect(() => {
    if (total <= 1 || isPaused || detailModal) return
    const timer = setInterval(() => {
      handleNext()
    }, 7000)
    return () => clearInterval(timer)
  }, [total, isPaused, detailModal, handleNext])

  // Touch handlers untuk swipe mobile (HP)
  const onTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const onTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const distance = touchStartX.current - touchEndX.current
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      handleNext()
    } else if (isRightSwipe) {
      handlePrev()
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  if (!announcements || total === 0) return null

  const current = announcements[currentIndex] || announcements[0]
  const isPenting = current.prioritas === "penting"

  // Ringkasan teks polos untuk tampilan minimalis
  const plainTextExcerpt = (current.isi || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[#*_`~>[\]]/g, "")
    .trim()

  return (
    <>
      {/* CARD BANNER MINIMALIS */}
      <div
        className="relative group rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 ${
            isPenting
              ? "bg-gradient-to-r from-rose-50/90 via-amber-50/30 to-white border-rose-200/90 text-rose-950"
              : "bg-gradient-to-r from-blue-50/90 via-indigo-50/30 to-white border-blue-200/90 text-blue-950"
          }`}
        >
          {/* Badge Count Indikator di Pojok Kanan Atas */}
          {total > 1 && (
            <span className="absolute top-2.5 right-3 text-[10px] font-bold text-slate-500 bg-white/90 border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
              {currentIndex + 1}/{total}
            </span>
          )}

          <div className="flex items-center justify-between gap-3 pt-0.5">
            {/* Bagian Kiri: Ikon & Konten Teks Minimalis */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Ikon Pengumuman Kompak */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                  isPenting ? "bg-rose-600 text-white" : "bg-blue-600 text-white"
                }`}
              >
                {isPenting ? (
                  <AlertCircle className="w-4 h-4 animate-pulse" />
                ) : (
                  <Megaphone className="w-4 h-4" />
                )}
              </div>

              {/* Teks Judul Lengkap & Cuplikan Singkat */}
              <div className="space-y-1 flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={`text-[9px] font-black uppercase px-2 py-0 border-none rounded-full ${
                      isPenting ? "bg-rose-600 text-white" : "bg-blue-600 text-white"
                    }`}
                  >
                    {isPenting ? "Penting" : "Pengumuman"}
                  </Badge>

                  <span className="text-[11px] text-slate-500 font-medium">
                    Oleh: <b>{current.penulisNama || "Ibu Guru"}</b>
                  </span>
                </div>

                {/* Judul Pengumuman Utuh (Full Text) */}
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug break-words">
                  {current.judul}
                </h3>

                {plainTextExcerpt && (
                  <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 leading-normal">
                    {plainTextExcerpt}
                  </p>
                )}
              </div>
            </div>

            {/* Bagian Kanan: Tombol "Lihat" & Navigasi Slider */}
            <div className="flex items-center gap-1.5 shrink-0 mt-3 sm:mt-0">
              <button
                type="button"
                onClick={() => setDetailModal(current)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 ${
                  isPenting
                    ? "bg-rose-600 hover:bg-rose-700 text-white active:scale-95"
                    : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
                }`}
              >
                <span>Lihat</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Kontrol Navigasi Geser (Jika > 1 pengumuman) */}
              {total > 1 && (
                <div className="hidden sm:flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    title="Pengumuman sebelumnya"
                    aria-label="Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    title="Pengumuman berikutnya"
                    aria-label="Berikutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Indikator Titik Paginasi Halus (Hanya jika > 1) */}
          {total > 1 && (
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/50">
              <div className="flex items-center gap-1.5">
                {announcements.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentIndex
                        ? isPenting
                          ? "w-5 bg-rose-600"
                          : "w-5 bg-blue-600"
                        : "w-1.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Navigasi Panah Geser Mobile */}
              <div className="flex sm:hidden items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 active:scale-95"
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 active:scale-95"
                  aria-label="Berikutnya"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODAL DETAIL PENGUMUMAN LENGKAP */}
      {detailModal && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setDetailModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              className={`p-5 border-b flex items-start justify-between gap-3 ${
                detailModal.prioritas === "penting"
                  ? "bg-rose-50/70 border-rose-100"
                  : "bg-blue-50/70 border-blue-100"
              }`}
            >
              <div className="space-y-1.5 flex-1 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 border-none rounded-full ${
                      detailModal.prioritas === "penting"
                        ? "bg-rose-600 text-white"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {detailModal.prioritas === "penting" ? "Penting" : "Informasi"}
                  </Badge>
                  <span className="text-[11px] font-semibold text-slate-600">
                    Oleh: {detailModal.penulisNama || "Ibu Guru"}
                  </span>
                  {detailModal.createdAt && (
                    <span className="text-[11px] text-slate-400">
                      &bull; {formatDate(detailModal.createdAt)}
                    </span>
                  )}
                </div>

                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  {detailModal.judul}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Isi Pengumuman Lengkap (Markdown Rich Format) */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="prose prose-sm max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed rich-editor-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {detailModal.isi}
                </ReactMarkdown>
              </div>

              {detailModal.tingkat && detailModal.tingkat.length > 0 && (
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">Sasaran:</span>
                  <div className="flex gap-1 flex-wrap">
                    {detailModal.tingkat.map((t) => (
                      <span
                        key={t}
                        className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[11px]"
                      >
                        Kelas {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
