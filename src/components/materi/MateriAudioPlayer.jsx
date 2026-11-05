import React, { useState, useEffect, useRef } from "react"
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Gauge,
  UserCheck,
} from "lucide-react"

/**
 * Helper untuk membersihkan format markdown menjadi teks narasi polos yang enak didengar
 */
function cleanMarkdownForSpeech(markdownText) {
  if (!markdownText) return ""
  return markdownText
    // Hapus format gambar & link markdown [teks](url) -> teks
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    // Hapus kode blok ```code``` dan `inline code`
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // Hapus header markdown #, ##, ###
    .replace(/#{1,6}\s+/g, "")
    // Hapus bold/italic **teks**, *teks*, __teks__
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // Hapus blockquote >
    .replace(/^\s*>\s+/gm, "")
    // Hapus garis horizontal ---, ***
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Hapus list bullets -, *, +, 1.
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // Hapus tag HTML jika ada
    .replace(/<[^>]*>/g, "")
    // Normalisasi spasi dan baris baru
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function MateriAudioPlayer({ judulBab = "", kontenMarkdown = "" }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [rate, setRate] = useState(1.0) // 0.8x, 1x, 1.2x, 1.5x
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [availableVoices, setAvailableVoices] = useState([])
  const [isSupported, setIsSupported] = useState(true)
  const [progress, setProgress] = useState(0)

  const utteranceRef = useRef(null)
  const fullTextRef = useRef("")

  // Siapkan daftar suara Bahasa Indonesia saat komponen dimuat
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false)
      return
    }

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          // Prioritaskan suara id-ID / Indonesia
          const idVoices = voices.filter(
            (v) => v.lang.startsWith("id") || v.lang.includes("ID") || v.name.toLowerCase().includes("indonesia")
          )
          setAvailableVoices(idVoices.length > 0 ? idVoices : voices)
          if (!selectedVoice && idVoices.length > 0) {
            setSelectedVoice(idVoices[0])
          }
        }
      } catch (err) {
        console.warn("Gagal memuat voices:", err)
      }
    }

    loadVoices()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    return () => {
      // Hentikan suara saat pengguna berpindah bab atau meninggalkan halaman
      try {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel()
        }
      } catch (_) {}
    }
  }, [])

  // Setiap kali bab berganti, reset status pembacaan
  useEffect(() => {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    } catch (_) {}
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
  }, [judulBab, kontenMarkdown])

  const handlePlayOrPause = () => {
    if (!isSupported) {
      alert("Browser Anda belum mendukung fitur Web Speech Text-to-Speech.")
      return
    }

    const synth = window.speechSynthesis

    // Jika sedang paused, lanjutkan (resume)
    if (isPaused) {
      synth.resume()
      setIsPaused(false)
      setIsPlaying(true)
      return
    }

    // Jika sedang playing, jeda (pause)
    if (isPlaying) {
      synth.pause()
      setIsPaused(true)
      setIsPlaying(false)
      return
    }

    // Mulai pembacaan baru dari awal
    synth.cancel()

    const narasiBab = `${judulBab}. ${cleanMarkdownForSpeech(kontenMarkdown)}`
    fullTextRef.current = narasiBab

    if (!narasiBab.trim()) {
      alert("Tidak ada teks konten pada bab ini untuk dibaca.")
      return
    }

    const utterance = new SpeechSynthesisUtterance(narasiBab)
    utterance.lang = "id-ID"
    utterance.rate = rate
    utterance.pitch = 1.0

    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.onstart = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(100)
    }

    utterance.onerror = (e) => {
      console.warn("Speech synthesis error:", e)
      setIsPlaying(false)
      setIsPaused(false)
    }

    // Hitung estimasi progress membaca
    utterance.onboundary = (e) => {
      if (e.charIndex && narasiBab.length > 0) {
        const pct = Math.min(100, Math.round((e.charIndex / narasiBab.length) * 100))
        setProgress(pct)
      }
    }

    utteranceRef.current = utterance
    synth.speak(utterance)
  }

  const handleStop = () => {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    } catch (_) {}
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
  }

  const cycleSpeed = () => {
    const speeds = [0.85, 1.0, 1.25, 1.5]
    const nextIdx = (speeds.indexOf(rate) + 1) % speeds.length
    const nextRate = speeds[nextIdx]
    setRate(nextRate)

    // Jika sedang aktif memutar, restart dengan kecepatan baru dari awal agar konsisten
    if (isPlaying) {
      handleStop()
      setTimeout(() => {
        handlePlayOrPause()
      }, 150)
    }
  }

  if (!isSupported) return null

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md border border-blue-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-2 animate-in fade-in duration-200">
      {/* Label & Status Pemutaran */}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
            isPlaying ? "bg-emerald-500 text-white scale-105 shadow-md shadow-emerald-500/30 animate-pulse" : "bg-white/15 text-blue-200"
          }`}
        >
          {isPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 opacity-80" />}
        </div>
        <div className="min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Narasi Suara AI (Text-to-Speech)
            </span>
          </div>
          <h4 className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
            {isPlaying
              ? "Sedang Membacakan Materi..."
              : isPaused
              ? "Narasi Dijeda"
              : "Dengarkan Penjelasan Bab Ini"}
          </h4>
          <p className="text-[10px] text-blue-200/80 hidden sm:block">
            Membantu siswa memahami bacaan melalui pelafalan audio otomatis bahasa Indonesia.
          </p>
        </div>
      </div>

      {/* Kontrol Player Audio */}
      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
        {/* Tombol Kecepatan */}
        <button
          type="button"
          onClick={cycleSpeed}
          title="Atur Kecepatan Bicara"
          className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-[11px] font-black text-blue-200 flex items-center gap-1 border border-white/10 transition-all"
        >
          <Gauge className="w-3 h-3 text-blue-400" />
          <span>{rate}x</span>
        </button>

        {/* Tombol Stop / Reset */}
        {(isPlaying || isPaused) && (
          <button
            type="button"
            onClick={handleStop}
            title="Hentikan Narasi"
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 active:scale-95 text-slate-300 border border-white/10 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Tombol Utama Play / Pause */}
        <button
          type="button"
          onClick={handlePlayOrPause}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
            isPlaying
              ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
              : "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/30"
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Jeda</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>{isPaused ? "Lanjutkan" : "Putar Suara"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

