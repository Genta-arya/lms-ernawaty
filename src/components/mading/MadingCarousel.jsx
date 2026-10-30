import React, { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { UserAvatar } from "@/components/common/UserAvatar"
import {
  Feather,
  Heart,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function MadingCarousel({ karyaList = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef(null)
  const touchEndX = useRef(null)

  // Maksimal 3 karya terbaru
  const items = (karyaList || []).slice(0, 3)
  const total = items.length

  const handleNext = useCallback(() => {
    if (total <= 1) return
    setCurrentIndex((prev) => (prev + 1) % total)
  }, [total])

  const handlePrev = useCallback(() => {
    if (total <= 1) return
    setCurrentIndex((prev) => (prev - 1 + total) % total)
  }, [total])

  // Auto-slide setiap 6 detik jika tidak di-pause
  useEffect(() => {
    if (total <= 1 || isPaused) return
    const timer = setInterval(() => {
      handleNext()
    }, 6000)
    return () => clearInterval(timer)
  }, [total, isPaused, handleNext])

  // Touch Swipe Handler
  const onTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const onTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const dist = touchStartX.current - touchEndX.current
    if (dist > 50) handleNext()
    if (dist < -50) handlePrev()
    touchStartX.current = null
    touchEndX.current = null
  }

  if (total === 0) {
    return (
      <div className="text-center py-6 px-4 bg-white border border-dashed border-rose-200 rounded-2xl">
        <Feather className="w-6 h-6 text-rose-300 mx-auto mb-1.5" />
        <p className="font-bold text-slate-700 text-xs">Belum ada karya yang dipajang</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Jadilah siswa pertama yang mengunggah karya di Pojok Kreasi!
        </p>
        <Link
          to="/mading"
          className="inline-flex items-center justify-center mt-3 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-8 px-4 font-bold"
        >
          Unggah Karya Sekarang
        </Link>
      </div>
    )
  }

  const currentItem = items[currentIndex]

  return (
    <div
      className="relative group select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Kartu Carousel Utama (Menampilkan Seluruh Isi Konten Lengkap) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:border-rose-300 transition-all relative overflow-hidden">
        {/* Header Kartu: Kategori & Tanggal */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center gap-1">
              <Feather className="w-3 h-3" />
              <span>{currentItem.kategori || "Kreasi Siswa"}</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              Karya {currentIndex + 1} dari {total}
            </span>
          </div>

          <span className="text-[10px] text-slate-400 font-medium">
            {currentItem.createdAt?.seconds
              ? new Date(currentItem.createdAt.seconds * 1000).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Baru saja"}
          </span>
        </div>

        {/* Judul Karya */}
        <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug mb-2">
          {currentItem.judul}
        </h4>

        {/* ISI KONTEN LENGKAP (Semua value teks tampil utuh dan rapi) */}
        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100/90 text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap break-words max-h-56 overflow-y-auto mb-3.5">
          {currentItem.isi || currentItem.konten || currentItem.deskripsi || "Karya literasi siswa."}
        </div>

        {/* Footer Kartu: Info Penulis, Like, Komentar & Aksi */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar
              fotoUrl={currentItem.penulisFoto}
              nama={currentItem.penulisNama}
              size="xs"
              className="w-5 h-5 rounded-full ring-1 ring-slate-200 shrink-0"
            />
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-extrabold text-slate-800 text-[11px] truncate">
                {currentItem.penulisNama}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-blue-600 font-semibold text-[10px]">
                {currentItem.penulisKelas}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>{currentItem.likes?.length || 0}</span>
            </span>

            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentItem.komentar?.length || 0}</span>
            </span>

            <Link
              to="/mading"
              className="text-xs font-black text-rose-600 hover:text-rose-700 ml-1 flex items-center gap-0.5"
            >
              <span>Buka</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Navigasi Panah Carousel (Jika lebih dari 1 karya) */}
      {total > 1 && (
        <div className="flex items-center justify-between mt-2.5 px-1">
          {/* Titik Indikator Dots */}
          <div className="flex items-center gap-1.5">
            {items.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                title={`Buka karya ke-${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  currentIndex === idx
                    ? "w-5 bg-rose-600"
                    : "w-1.5 bg-slate-200 hover:bg-slate-300"
                )}
              />
            ))}
          </div>

          {/* Tombol Panah Prev / Next */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              title="Karya Sebelumnya"
              className="w-7 h-7 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 flex items-center justify-center transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              title="Karya Berikutnya"
              className="w-7 h-7 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 flex items-center justify-center transition-colors shadow-2xs"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

