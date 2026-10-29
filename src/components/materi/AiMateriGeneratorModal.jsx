import React, { useState, useEffect } from "react"
import { getGeminiKeys, generateMateriAi } from "@/services/ai"
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
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Wand2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Key,
  ShieldCheck,
} from "lucide-react"

export function AiMateriGeneratorModal({ isOpen, onClose, onGenerated, initialMapel = "Bahasa Indonesia" }) {
  const [prompt, setPrompt] = useState("")
  const [mapel, setMapel] = useState("Bahasa Indonesia")
  const [tingkat, setTingkat] = useState(["VIII"])
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState("")

  const keys = getGeminiKeys()

  // Interval indikator langkah saat AI sedang bekerja
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
    "Menghubungi Google Gemini 3.5 Flash...",
    "Menganalisis topik & kurikulum Fase D...",
    "Menyusun 4 bab materi & contoh teks...",
    "Menyelesaikan format modul pembelajaran...",
  ]

  useEffect(() => {
    if (isOpen) {
      setError("")
    }
  }, [isOpen])

  function toggleTingkat(t) {
    if (tingkat.includes(t)) {
      if (tingkat.length === 1) return // minimal 1
      setTingkat(tingkat.filter((item) => item !== t))
    } else {
      setTingkat([...tingkat, t])
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("Silakan tuliskan topik atau perintah materi yang ingin dibuat.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const result = await generateMateriAi({
        prompt: prompt.trim(),
        mapel,
        fase: "D",
        tingkat,
      })

      if (onGenerated) {
        onGenerated(result)
      }
      onClose()
    } catch (err) {
      console.error("Gemini Generation Error:", err)
      setError(err.message || "Gagal membuat materi dengan Gemini AI. Coba beberapa saat lagi.")
    } finally {
      setLoading(false)
    }
  }

  // Rekomendasi prompt sekali klik
  const quickPrompts = [
    "Teks Rekon Pribadi (Personal Recount) tentang Liburan Sekolah dan Strukturnya",
    "Factual Recount: Melaporkan Peristiwa Sejarah Kemerdekaan Indonesia",
    "Ciri Kebahasaan Teks Rekon: Simple Past Tense dan Action Verbs",
    "Membuat Teks Rekon Biografi Tokoh Pahlawan Nasional",
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-xl p-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white max-h-[90dvh] sm:max-h-[92vh] flex flex-col [&>button:last-child]:text-white/80 [&>button:last-child]:hover:text-white [&>button:last-child]:top-3.5 sm:[&>button:last-child]:top-4 [&>button:last-child]:right-3.5 sm:[&>button:last-child]:right-4 [&>button:last-child]:p-1.5 [&>button:last-child]:rounded-full [&>button:last-child]:bg-black/15 sm:[&>button:last-child]:bg-transparent">
        {/* Header Modal (Fixed Top) */}
        <DialogHeader className="p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shrink-0 pr-11 sm:pr-12 text-left">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-blue-100 bg-white/15 px-2.5 py-0.5 rounded-full backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Google Gemini AI</span>
            </div>
          </div>

          <DialogTitle className="text-base sm:text-xl font-black text-white mt-1">
            Buat Modul Materi Instan
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-xs text-blue-100/90 leading-relaxed">
            Ketik topik materi yang diinginkan, Gemini AI akan langsung menyusun seluruh isi bab, pengantar, contoh teks, dan rangkuman dalam hitungan detik.
          </DialogDescription>
        </DialogHeader>

        {/* Content Body (Scrollable Area) */}
        <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Prompt Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex flex-col xs:flex-row xs:items-center justify-between gap-0.5">
              <span>Perintah / Topik Materi:</span>
              <span className="text-[10px] text-slate-400 font-normal">Contoh: Teks Rekon, Recount Text</span>
            </label>
            <Textarea
              rows={3}
              placeholder="Contoh: Buatkan modul teks rekon lengkap untuk siswa kelas 8 SMP dengan contoh cerita pengalaman mengunjungi Keraton Matan Ketapang..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              className="rounded-2xl text-xs sm:text-sm p-3 sm:p-3.5 leading-relaxed bg-slate-50/50 focus:bg-white resize-none"
            />
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-500">Inspirasi Topik Cepat:</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(qp)}
                  disabled={loading}
                  className="text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-2.5 py-1 rounded-xl transition-colors text-left shrink-0 sm:shrink max-w-[260px] sm:max-w-none truncate"
                >
                  + {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Pengaturan Tingkat Kelas & Mapel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Mata Pelajaran</label>
              <Input
                value={mapel}
                onChange={(e) => setMapel(e.target.value)}
                disabled={loading}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tingkat Sasaran</label>
              <div className="flex gap-1.5">
                {["VII", "VIII", "IX"].map((t) => {
                  const active = tingkat.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTingkat(t)}
                      disabled={loading}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        active
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Kelas {t}
                    </button>
                  )
                })}
              </div>
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
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-3.5 sm:px-5 gap-1.5 sm:gap-2 shadow-xs shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-none">{loadingMessages[loadingStep]}</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Mulai Buat Materi Otomatis</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
