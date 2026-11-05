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
  const [rate, setRate] = useState(1.0)
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [availableVoices, setAvailableVoices] = useState([])
  const [isSupported, setIsSupported] = useState(true)
  const [currentSpokenWord, setCurrentSpokenWord] = useState("")

  const utteranceRef = useRef(null)
  const fullTextRef = useRef("")
  const lastCharIndexRef = useRef(0) // Menyimpan posisi karakter terakhir saat jeda

  // Bersihkan highlight lama di dokumen DOM
  const clearDomHighlights = () => {
    try {
      const container = document.getElementById("konten-materi-aktif")
      if (!container) return
      const highlightedElements = container.querySelectorAll(".tts-highlight-active")
      highlightedElements.forEach((el) => {
        el.classList.remove(
          "tts-highlight-active",
          "bg-amber-200/90",
          "dark:bg-amber-500/30",
          "text-slate-950",
          "rounded-md",
          "px-1",
          "py-0.5",
          "transition-all",
          "duration-150"
        )
      })
    } catch (_) {}
  }

  // Cari dan beri highlight pada kata/kalimat yang sedang dibaca di dalam container materi
  const highlightWordInDom = (word) => {
    if (!word || word.length < 2) return
    try {
      const container = document.getElementById("konten-materi-aktif")
      if (!container) return

      const cleanWord = word.trim().replace(/[.,!?;:"'()]/g, "")
      if (!cleanWord || cleanWord.length < 2) return

      const textNodes = container.querySelectorAll("p, li, td, th, h1, h2, h3, h4")
      for (const el of textNodes) {
        if (el.textContent && el.textContent.toLowerCase().includes(cleanWord.toLowerCase())) {
          clearDomHighlights()
          el.classList.add(
            "tts-highlight-active",
            "bg-amber-200/90",
            "dark:bg-amber-500/30",
            "text-slate-950",
            "rounded-md",
            "px-1",
            "py-0.5",
            "transition-all",
            "duration-150"
          )
          const rect = el.getBoundingClientRect()
          if (rect.top < 80 || rect.bottom > window.innerHeight - 80) {
            el.scrollIntoView({ behavior: "smooth", block: "center" })
          }
          break
        }
      }
    } catch (err) {
      console.warn("Highlight error:", err)
    }
  }

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
        console.warn("Gagal memuat voices:", err)
      }
    }

    loadVoices()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    return () => {
      clearDomHighlights()
      try {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel()
        }
      } catch (_) {}
    }
  }, [])

  // Setiap kali bab berganti, reset status pembacaan & highlight
  useEffect(() => {
    clearDomHighlights()
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    } catch (_) {}
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentSpokenWord("")
    lastCharIndexRef.current = 0
  }, [judulBab, kontenMarkdown])

  /**
   * Fungsi internal untuk memulai pemutaran dari posisi indeks karakter tertentu
   */
  const playFromIndex = (startIndex = 0) => {
    const synth = window.speechSynthesis
    synth.cancel()

    const rawFull = `${judulBab}. ${cleanMarkdownForSpeech(kontenMarkdown)}`
    fullTextRef.current = rawFull

    // Ambil sisa teks yang belum dibaca
    const textToSpeak = rawFull.slice(startIndex).trim()
    if (!textToSpeak) {
      setIsPlaying(false)
      setIsPaused(false)
      setCurrentSpokenWord("")
      clearDomHighlights()
      lastCharIndexRef.current = 0
      return
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
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
      setCurrentSpokenWord("")
      clearDomHighlights()
      lastCharIndexRef.current = 0
    }

    utterance.onerror = (e) => {
      console.warn("Speech synthesis error:", e)
      setIsPlaying(false)
      setIsPaused(false)
      clearDomHighlights()
    }

    utterance.onboundary = (e) => {
      if (e.name === "word" || typeof e.charIndex === "number") {
        // Hitung index absolut pada teks penuh
        const currentAbsoluteIndex = startIndex + (e.charIndex || 0)
        lastCharIndexRef.current = currentAbsoluteIndex

        const nextSpace = rawFull.indexOf(" ", currentAbsoluteIndex)
        const word = rawFull.slice(currentAbsoluteIndex, nextSpace !== -1 ? nextSpace : currentAbsoluteIndex + 15).trim()
        if (word) {
          setCurrentSpokenWord(word)
          highlightWordInDom(word)
        }
      }
    }

    utteranceRef.current = utterance
    synth.speak(utterance)
  }

  const handlePlayOrPause = () => {
    if (!isSupported) {
      alert("Browser Anda belum mendukung fitur Web Speech Text-to-Speech.")
      return
    }

    const synth = window.speechSynthesis

    // KASUS 1: Jika sedang dijeda (isPaused), LANJUTKAN pembacaan dari titik terakhir
    if (isPaused) {
      setIsPaused(false)
      setIsPlaying(true)
      // Jalankan dari posisi karakter terakhir saat dijeda
      playFromIndex(lastCharIndexRef.current)
      return
    }

    // KASUS 2: Jika sedang berbunyi (isPlaying), JEDA pembacaan
    if (isPlaying) {
      synth.cancel() // Batalkan speech aktif agar tidak menggantung di browser
      setIsPaused(true)
      setIsPlaying(false)
      return
    }

    // KASUS 3: Mulai dari awal (0)
    lastCharIndexRef.current = 0
    clearDomHighlights()
    playFromIndex(0)
  }

  const handleStop = () => {
    clearDomHighlights()
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    } catch (_) {}
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentSpokenWord("")
    lastCharIndexRef.current = 0
  }

  const cycleSpeed = () => {
    const speeds = [0.85, 1.0, 1.25, 1.5]
    const nextIdx = (speeds.indexOf(rate) + 1) % speeds.length
    const nextRate = speeds[nextIdx]
    setRate(nextRate)

    // Jika sedang aktif memutar, lanjutkan dengan speed baru dari posisi sekarang
    if (isPlaying) {
      playFromIndex(lastCharIndexRef.current)
    }
  }

  if (!isSupported) return null

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
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Narasi Suara AI (Text-to-Speech)
              </span>
              {isPlaying && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.2 rounded-full">
                  <Highlighter className="w-2.5 h-2.5" />
                  Live Highlight
                </span>
              )}
              {isPaused && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-500/30 text-amber-300 px-2 py-0.2 rounded-full">
                  Dijeda (Bisa Dilanjutkan)
                </span>
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
              {isPlaying
                ? "Sedang Membacakan Materi..."
                : isPaused
                ? "Narasi Sedang Dijeda"
                : "Dengarkan Penjelasan Bab Ini"}
            </h4>
            <p className="text-[10px] text-blue-200/80 hidden sm:block">
              {isPaused
                ? "Klik Lanjutkan untuk meneruskan suara dari kalimat terakhir."
                : "Teks bacaan yang sedang diucapkan akan otomatis disorot (highlight kuning) secara visual."}
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

      {/* Floating Subtitle / Banner Kata Aktif saat Narasi Berjalan atau Dijeda */}
      {(isPlaying || isPaused) && currentSpokenWord && (
        <div className="p-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 truncate">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isPlaying ? "bg-amber-500 animate-ping" : "bg-amber-500"
              }`}
            />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {isPlaying ? "Kata yang sedang dibaca:" : "Posisi saat dijeda:"}
            </span>
            <b className="text-amber-700 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/40 px-1.5 py-0.5 rounded text-xs">
              "{currentSpokenWord}"
            </b>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0">
            {isPlaying ? "Auto Scroll" : "Siap Dilanjutkan"}
          </span>
        </div>
      )}
    </div>
  )
}
