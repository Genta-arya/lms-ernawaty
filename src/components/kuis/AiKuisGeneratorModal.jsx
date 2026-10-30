import React, { useState, useEffect } from "react"
import { generateKuisAi } from "@/services/ai"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sparkles,
  Wand2,
  Loader2,
  AlertCircle,
  FileQuestion,
  CheckCircle2,
} from "lucide-react"

export function AiKuisGeneratorModal({
  isOpen,
  onClose,
  onGenerated,
  materiList = [],
  defaultMateriId = "",
}) {
  const [prompt, setPrompt] = useState("")
  const [selectedMateriId, setSelectedMateriId] = useState(defaultMateriId)
  const [jumlahSoal, setJumlahSoal] = useState(5)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen) {
      setError("")
      if (defaultMateriId) {
        setSelectedMateriId(defaultMateriId)
      } else if (materiList.length > 0 && !selectedMateriId) {
        setSelectedMateriId(materiList[0].id)
      }
    }
  }, [isOpen, defaultMateriId, materiList])

  useEffect(() => {
    let timer
    if (loading) {
      setLoadingStep(0)
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4)
      }, 2500)
    }
    return () => clearInterval(timer)
  }, [loading])

  const loadingMessages = [
    "Menghubungi Google Gemini AI...",
    "Merancang butir pertanyaan & opsi pilihan...",
    "Menentukan kunci jawaban & pembahasan edukatif...",
    "Menyelesaikan paket kuis interaktif...",
  ]

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("Silakan tuliskan topik kuis atau perintah pembuatan soal.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const selectedMateri = materiList.find((m) => m.id === selectedMateriId)
      const result = await generateKuisAi({
        prompt: prompt.trim(),
        materiJudul: selectedMateri ? selectedMateri.judul : "",
        jumlahSoal: Number(jumlahSoal) || 5,
      })

      if (onGenerated) {
        onGenerated({
          ...result,
          materiId: selectedMateriId || "",
        })
      }
      onClose()
    } catch (err) {
      console.error("Gemini Kuis Error:", err)
      setError(err.message || "Gagal membuat kuis dengan Gemini AI. Coba beberapa saat lagi.")
    } finally {
      setLoading(false)
    }
  }

  const quickPrompts = [
    "5 Soal Pemahaman Generic Structure Recount Text (Orientation, Events, Re-orientation)",
    "5 Soal Ciri Kebahasaan Simple Past Tense dan Action Verbs pada Teks Rekon",
    "5 Soal Analisis Teks Cerita Liburan Sekolah beserta Pembahasannya",
    "5 Soal Perbedaan Personal Recount dan Factual Recount",
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-xl p-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white max-h-[90dvh] sm:max-h-[92vh] flex flex-col [&>button:last-child]:text-white/80 [&>button:last-child]:hover:text-white [&>button:last-child]:top-3.5 sm:[&>button:last-child]:top-4 [&>button:last-child]:right-3.5 sm:[&>button:last-child]:right-4 [&>button:last-child]:p-1.5 [&>button:last-child]:rounded-full [&>button:last-child]:bg-black/15 sm:[&>button:last-child]:bg-transparent">
        {/* Header Modal (Fixed Top) */}
        <DialogHeader className="p-4 sm:p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700 text-white shrink-0 pr-11 sm:pr-12 text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-amber-100 bg-white/15 px-2.5 py-0.5 rounded-full backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Quiz Generator</span>
            </div>
            <span className="hidden xs:inline-block text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
              PG & Benar/Salah
            </span>
          </div>

          <DialogTitle className="text-base sm:text-xl font-black text-white mt-1">
            Buat Kuis Interaktif Otomatis
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-xs text-amber-100/90 leading-relaxed">
            Ketik topik kuis atau konsep materi, AI akan langsung membuatkan butir soal lengkap dengan pilihan jawaban, kunci, dan pembahasan edukatif.
          </DialogDescription>
        </DialogHeader>

        {/* Content Body (Scrollable Area) */}
        <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in">
              <div className="flex items-start gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleGenerate}
                disabled={loading}
                className="shrink-0 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-7 px-3 w-full sm:w-auto"
              >
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Prompt Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex flex-col xs:flex-row xs:items-center justify-between gap-0.5">
              <span>Perintah / Topik Kuis:</span>
              <span className="text-[10px] text-slate-400 font-normal">Contoh: Pemahaman teks, tata bahasa</span>
            </label>
            <Textarea
              rows={3}
              placeholder="Contoh: Buatkan 5 soal pemahaman mengenai generic structure teks rekon dan penggunaan simple past tense dengan pembahasan lengkap..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              className="rounded-2xl text-xs sm:text-sm p-3 sm:p-3.5 leading-relaxed bg-slate-50/50 focus:bg-white resize-none"
            />
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-500">Inspirasi Soal Cepat:</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(qp)}
                  disabled={loading}
                  className="text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 px-2.5 py-1 rounded-xl transition-colors text-left shrink-0 sm:shrink max-w-[260px] sm:max-w-none truncate"
                >
                  + {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Pilihan Materi Terkait & Jumlah Soal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tautkan ke Materi (Opsional)</label>
              <select
                value={selectedMateriId}
                onChange={(e) => setSelectedMateriId(e.target.value)}
                disabled={loading}
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium"
              >
                <option value="">-- Tanpa Tautan Materi --</option>
                {materiList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.judul} ({m.topik || "Umum"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Jumlah Butir Soal</label>
              <select
                value={jumlahSoal}
                onChange={(e) => setJumlahSoal(Number(e.target.value))}
                disabled={loading}
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium"
              >
                <option value={5}>5 Soal (Standar)</option>
                <option value={8}>8 Soal (Menengah)</option>
                <option value={10}>10 Soal (Lengkap)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions (Fixed Bottom) */}
        <div className="p-3.5 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 h-9 px-3 sm:px-4"
          >
            Batal
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-3.5 sm:px-5 gap-1.5 sm:gap-2 shadow-xs shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-none">{loadingMessages[loadingStep]}</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Mulai Buat Kuis Otomatis</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

