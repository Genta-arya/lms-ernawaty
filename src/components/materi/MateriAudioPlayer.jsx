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
 * Memecah teks menjadi potongan kalimat-kalimat (sentence chunks)
 */
function splitIntoSentences(text) {
  if (!text) return []
  // Pisahkan berdasarkan tanda titik, tanda seru, tanda tanya, atau baris baru
  const rawSentences = text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return rawSentences
}

/**
 * Membersihkan format markdown
 */
function cleanMarkdown(text) {
  if (!text) return ""
  return text
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
}

export function MateriAudioPlayer({ judulBab = "", kontenMarkdown = "" }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [rate, setRate] = useState(1.0)
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [availableVoices, setAvailableVoices] = useState([])
  const [isSupported, setIsSupported] = useState(true)
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [currentSentenceText, setCurrentSentenceText] = useState("")

  const sentencesRef = useRef([])
  const sentenceIndexRef = useRef(0)
  const isPlayingRef = useRef(false)
  const isPausedRef = useRef(false)
  const rateRef = useRef(rate)

  useEffect(() => {
    rateRef.current = rate
  }, [rate])

  // Menyiapkan array kalimat saat bab / konten berubah
  useEffect(() => {
    const rawClean = cleanMarkdown(kontenMarkdown)
    const sentences = [judulBab, ...splitIntoSentences(rawClean)].filter(Boolean)
    sentencesRef.current = sentences
    sentenceIndexRef.current = 0
    isPlayingRef.current = false
    isPausedRef.current = false

    setIsPlaying(false)
    setIsPaused(false)
    setCurrentSentenceIndex(0)
    setCurrentSentenceText("")
    clearDomHighlights()

    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    } catch (_) {}
  }, [judulBab, kontenMarkdown])

  // Bersihkan highlight di DOM
  const clearDomHighlights = () => {
    try {
      const container = document.getElementById("konten-materi-aktif")
      if (!container) return
      const highlighted = container.querySelectorAll(".tts-highlight-active")
      highlighted.forEach((el) => el.classList.remove("tts-highlight-active"))
    } catch (_) {}
  }

  // Highlight kalimat aktif di konten materi
  const highlightSentenceInDom = (sentence, index) => {
    try {
      const container = document.getElementById("konten-materi-aktif")
      if (!container || !sentence) return

      clearDomHighlights()

      // Ambil beberapa kata kunci dari kalimat (minimal 4 karakter)
      const words = sentence
        .replace(/[.,!?;:"'()]/g, "")
        .split(/\s+/)
        .filter((w) => w.length >= 4)

      let matchedEl = null

      if (words.length > 0) {
        const textNodes = container.querySelectorAll("p, li, td, th, h1, h2, h3, h4")
        for (const el of textNodes) {
          const elText = el.textContent || ""
          // Cek apakah kalimat ada di dalam elemen, atau minimal 2 kata kuncinya ada
          if (elText.includes(sentence.slice(0, 20))) {
            matchedEl = el
            break
          }
          const matches = words.filter((w) => elText.toLowerCase().includes(w.toLowerCase()))
          if (matches.length >= Math.min(2, words.length)) {
            matchedEl = el
            break
          }
        }
      }

      // Fallback proporsional jika tidak match
      if (!matchedEl) {
        const textNodes = Array.from(container.querySelectorAll("p, li, td, h2, h3"))
        if (textNodes.length > 0) {
          const ratio = Math.min(1, index / Math.max(1, sentencesRef.current.length - 1))
          const targetIdx = Math.min(textNodes.length - 1, Math.floor(ratio * textNodes.length))
          matchedEl = textNodes[targetIdx]
        }
      }

      if (matchedEl) {
        matchedEl.classList.add("tts-highlight-active")
        const rect = matchedEl.getBoundingClientRect()
        if (rect.top < 100 || rect.bottom > window.innerHeight - 100) {
          matchedEl.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }
    } catch (err) {
      console.warn("Highlight sentence error:", err)
    }
  }

  // Load voices
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
      clearDomHighlights()
      try {
        if (window.speechSynthesis) window.speechSynthesis.cancel()
      } catch (_) {}
    }
  }, [])

  // Fungsi rekursif membacakan kalimat per kalimat
  const speakCurrentSentence = () => {
    const synth = window.speechSynthesis
    synth.cancel()

    const index = sentenceIndexRef.current
    const sentences = sentencesRef.current

    if (index >= sentences.length || !isPlayingRef.current) {
      // Selesai membaca semua kalimat
      setIsPlaying(false)
      setIsPaused(false)
      isPlayingRef.current = false
      isPausedRef.current = false
      setCurrentSentenceText("")
      clearDomHighlights()
      return
    }

    const text = sentences[index]
    setCurrentSentenceIndex(index)
    setCurrentSentenceText(text)
    highlightSentenceInDom(text, index)

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "id-ID"
    utterance.rate = rateRef.current
    utterance.pitch = 1.0

    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.onend = () => {
      // Jika saat selesai kalimat sedang tidak dalam status paused, lanjut ke kalimat berikutnya
      if (isPlayingRef.current && !isPausedRef.current) {
        sentenceIndexRef.current += 1
        speakCurrentSentence()
      }
    }

    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        console.warn("TTS sentence error:", e)
        if (isPlayingRef.current && !isPausedRef.current) {
          sentenceIndexRef.current += 1
          speakCurrentSentence()
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

    // KASUS 1: Jika sedang dijeda (isPaused), LANJUTKAN dari kalimat terakhir
    if (isPaused) {
      setIsPaused(false)
      setIsPlaying(true)
      isPausedRef.current = false
      isPlayingRef.current = true
      speakCurrentSentence()
      return
    }

    // KASUS 2: Jika sedang berbunyi (isPlaying), JEDA pembacaan pada kalimat saat ini
    if (isPlaying) {
      synth.cancel() // Hentikan ucapan aktif
      setIsPaused(true)
      setIsPlaying(false)
      isPausedRef.current = true
      isPlayingRef.current = false
      // Highlight tetap bertahan di kalimat yang sedang dijeda agar siswa tahu di mana jedanya!
      return
    }

    // KASUS 3: Mulai dari awal (kalimat 0)
    sentenceIndexRef.current = 0
    setIsPlaying(true)
    setIsPaused(false)
    isPlayingRef.current = true
    isPausedRef.current = false
    speakCurrentSentence()
  }

  const handleStop = () => {
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    } catch (_) {}
    sentenceIndexRef.current = 0
    isPlayingRef.current = false
    isPausedRef.current = false
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentSentenceText("")
    clearDomHighlights()
  }

  const cycleSpeed = () => {
    const speeds = [0.85, 1.0, 1.25, 1.5]
    const nextIdx = (speeds.indexOf(rate) + 1) % speeds.length
    const nextRate = speeds[nextIdx]
    setRate(nextRate)
    rateRef.current = nextRate

    // Jika sedang play, langsung ulangi kalimat saat ini dengan kecepatan baru
    if (isPlaying) {
      speakCurrentSentence()
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Narasi Suara AI (Text-to-Speech)
              </span>
              {isPlaying && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.2 rounded-full">
                  <Highlighter className="w-2.5 h-2.5" />
                  Live Highlight Kuning
                </span>
              )}
              {isPaused && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-500/30 text-amber-300 px-2 py-0.2 rounded-full">
                  Dijeda di Kalimat {currentSentenceIndex + 1}
                </span>
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
              {isPlaying
                ? `Membacakan Kalimat ${currentSentenceIndex + 1} dari ${sentencesRef.current.length}...`
                : isPaused
                ? "Narasi Sedang Dijeda"
                : "Dengarkan Penjelasan Bab Ini"}
            </h4>
            <p className="text-[10px] text-blue-200/80 hidden sm:block">
              {isPaused
                ? "Klik Lanjutkan untuk meneruskan tepat dari kalimat ini."
                : "Paragraf/kalimat yang dibaca otomatis disorot kuning dan di-scroll mengikuti suara."}
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

      {/* Floating Subtitle / Banner Kalimat Aktif */}
      {(isPlaying || isPaused) && currentSentenceText && (
        <div className="p-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 truncate">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isPlaying ? "bg-amber-500 animate-ping" : "bg-amber-500"
              }`}
            />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
              {isPlaying ? "Sedang dibaca:" : "Dijeda pada:"}
            </span>
            <span className="text-amber-800 dark:text-amber-300 font-bold truncate text-xs">
              "{currentSentenceText}"
            </span>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0 font-bold">
            {currentSentenceIndex + 1}/{sentencesRef.current.length}
          </span>
        </div>
      )}
    </div>
  )
}
