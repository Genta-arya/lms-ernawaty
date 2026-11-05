import React, { useState, useEffect, useRef } from "react"
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Gauge,
  Highlighter,
} from "lucide-react"

export function MateriAudioPlayer({
  judulBab = "",
  kontenMarkdown = "",
  activeParagraphIndex = -1,
  onParagraphChange,
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [rate, setRate] = useState(1.0)
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [availableVoices, setAvailableVoices] = useState([])
  const [isSupported, setIsSupported] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  const paragraphsRef = useRef([])
  const currentIndexRef = useRef(0)
  const isPlayingRef = useRef(false)
  const isPausedRef = useRef(false)
  const rateRef = useRef(rate)

  useEffect(() => {
    rateRef.current = rate
  }, [rate])

  // Pecah konten bab menjadi array blok/paragraf yang bersih
  useEffect(() => {
    // Bersihkan karakter markdown untuk speech
    const cleanBlocks = (kontenMarkdown || "")
      .split(/\n\s*\n/)
      .map((block) => {
        return block
          .replace(/!\[.*?\]\(.*?\)/g, "")
          .replace(/\[(.*?)\]\(.*?\)/g, "$1")
          .replace(/```[\s\S]*?```/g, "")
          .replace(/`([^`]+)`/g, "$1")
          .replace(/#{1,6}\s+/g, "")
          .replace(/(\*\*|__)(.*?)\1/g, "$2")
          .replace(/(\*|_)(.*?)\1/g, "$2")
          .replace(/^\s*>\s+/gm, "")
          .replace(/^[-*_]{3,}\s*$/gm, "")
          .replace(/^\s*[-*+]\s+/gm, "")
          .replace(/^\s*\d+\.\s+/gm, "")
          .replace(/<[^>]*>/g, "")
          .trim()
      })
      .filter((b) => b.length > 0)

    paragraphsRef.current = cleanBlocks
    currentIndexRef.current = 0
    isPlayingRef.current = false
    isPausedRef.current = false

    setIsPlaying(false)
    setIsPaused(false)
    setCurrentIndex(0)
    if (onParagraphChange) onParagraphChange(-1)

    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    } catch (_) {}
  }, [judulBab, kontenMarkdown])

  // Inisialisasi daftar suara Bahasa Indonesia
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false)
      return
    }

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          const idVoices = voices.filter(
            (v) => v.lang.startsWith("id") || v.lang.includes("ID") || v.name.toLowerCase().includes("indonesia")
          )
          setAvailableVoices(idVoices.length > 0 ? idVoices : voices)
          if (!selectedVoice && idVoices.length > 0) {
            setSelectedVoice(idVoices[0])
          }
        }
      } catch (err) {
        console.warn("Gagal load voices:", err)
      }
    }

    loadVoices()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    return () => {
      if (onParagraphChange) onParagraphChange(-1)
      try {
        if (window.speechSynthesis) window.speechSynthesis.cancel()
      } catch (_) {}
    }
  }, [])

  // Fungsi membacakan paragraf per paragraf dengan presisi tinggi
  const speakCurrentParagraph = () => {
    const synth = window.speechSynthesis
    synth.cancel()

    const index = currentIndexRef.current
    const paragraphs = paragraphsRef.current

    if (index >= paragraphs.length || !isPlayingRef.current) {
      setIsPlaying(false)
      setIsPaused(false)
      isPlayingRef.current = false
      isPausedRef.current = false
      if (onParagraphChange) onParagraphChange(-1)
      return
    }

    const textToSpeak = paragraphs[index]
    setCurrentIndex(index)
    if (onParagraphChange) onParagraphChange(index)

    // Scroll paragraf aktif ke tengah layar secara mulus
    try {
      const activeEl = document.querySelector(`[data-paragraph-index="${index}"]`)
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    } catch (_) {}

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    utterance.lang = "id-ID"
    utterance.rate = rateRef.current
    utterance.pitch = 1.0

    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.onend = () => {
      if (isPlayingRef.current && !isPausedRef.current) {
        currentIndexRef.current += 1
        speakCurrentParagraph()
      }
    }

    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        console.warn("TTS paragraph error:", e)
        if (isPlayingRef.current && !isPausedRef.current) {
          currentIndexRef.current += 1
          speakCurrentParagraph()
        }
      }
    }

    synth.speak(utterance)
  }

  const handlePlayOrPause = () => {
    if (!isSupported) {
      alert("Browser Anda belum mendukung fitur Web Speech Text-to-Speech.")
      return
    }

    const synth = window.speechSynthesis

    // KASUS 1: Lanjutkan dari paragraf yang dijeda
    if (isPaused) {
      setIsPaused(false)
      setIsPlaying(true)
      isPausedRef.current = false
      isPlayingRef.current = true
      speakCurrentParagraph()
      return
    }

    // KASUS 2: Jeda pada paragraf saat ini
    if (isPlaying) {
      synth.cancel()
      setIsPaused(true)
      setIsPlaying(false)
      isPausedRef.current = true
      isPlayingRef.current = false
      // Highlight tetap bertahan di paragraf yang sedang dijeda
      return
    }

    // KASUS 3: Mulai baru dari paragraf pertama
    currentIndexRef.current = 0
    setIsPlaying(true)
    setIsPaused(false)
    isPlayingRef.current = true
    isPausedRef.current = false
    speakCurrentParagraph()
  }

  const handleStop = () => {
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    } catch (_) {}
    currentIndexRef.current = 0
    isPlayingRef.current = false
    isPausedRef.current = false
    setIsPlaying(false)
    setIsPaused(false)
    if (onParagraphChange) onParagraphChange(-1)
  }

  const cycleSpeed = () => {
    const speeds = [0.85, 1.0, 1.25, 1.5]
    const nextIdx = (speeds.indexOf(rate) + 1) % speeds.length
    const nextRate = speeds[nextIdx]
    setRate(nextRate)
    rateRef.current = nextRate

    if (isPlaying) {
      speakCurrentParagraph()
    }
  }

  if (!isSupported) return null

  const totalParagraphs = paragraphsRef.current.length

  return (
    <div className="space-y-2 my-2">
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md border border-blue-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in duration-200">
        {/* Label & Status Pemutaran */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
              isPlaying
                ? "bg-emerald-500 text-white scale-105 shadow-md shadow-emerald-500/30 animate-pulse"
                : isPaused
                ? "bg-amber-500 text-slate-950 scale-100"
                : "bg-white/15 text-blue-200"
            }`}
          >
            {isPlaying ? (
              <Volume2 className="w-5 h-5" />
            ) : isPaused ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <VolumeX className="w-5 h-5 opacity-80" />
            )}
          </div>
          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Narasi Suara AI (Text-to-Speech)
              </span>
              {isPlaying && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.2 rounded-full">
                  <Highlighter className="w-2.5 h-2.5" />
                  Live Highlight Paragraf
                </span>
              )}
              {isPaused && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-500/30 text-amber-300 px-2 py-0.2 rounded-full">
                  Dijeda di Paragraf {currentIndex + 1}
                </span>
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
              {isPlaying
                ? `Membacakan Paragraf ${currentIndex + 1} dari ${totalParagraphs}...`
                : isPaused
                ? "Narasi Sedang Dijeda"
                : "Dengarkan Penjelasan Bab Ini"}
            </h4>
            <p className="text-[10px] text-blue-200/80 hidden sm:block">
              {isPaused
                ? "Klik Lanjutkan untuk meneruskan tepat dari paragraf yang tersorot."
                : "Paragraf yang sedang dibaca otomatis disorot kuning dan layar bergulir secara otomatis."}
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
              title="Hentikan & Reset ke Awal"
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
                : isPaused
                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30"
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
    </div>
  )
}
