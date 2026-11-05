import React, { useState, useEffect } from "react"
import {
  Sparkles,
  Bot,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Award,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { generatePenjelasanDanRangkumanBabAi } from "@/services/ai"

export function MateriAiSummaryCard({
  materiId,
  materiJudul = "",
  currentBagianIndex = 0,
  currentBagian = null,
  totalBagian = 1,
  semuaBagian = [],
}) {
  const isBabAkhir = currentBagianIndex === totalBagian - 1

  // Cache key per bab
  const cacheKey = `lms_ai_summary_${materiId || "temp"}_bab_${currentBagianIndex}`

  const [summary, setSummary] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  // Cek cache saat bab berubah
  useEffect(() => {
    setError(null)
    setCopied(false)

    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setSummary(cached)
        return
      }
    } catch (_) {}

    setSummary("")
  }, [cacheKey])

  const handleGenerate = async (forceRefresh = false) => {
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          setSummary(cached)
          return
        }
      } catch (_) {}
    }

    setLoading(true)
    setError(null)

    try {
      const result = await generatePenjelasanDanRangkumanBabAi({
        materiJudul,
        babJudul: currentBagian?.judul || `Bab ${currentBagianIndex + 1}`,
        kontenBab: currentBagian?.konten || "",
        isBabAkhir,
        semuaBab: semuaBagian,
      })

      setSummary(result)
      try {
        localStorage.setItem(cacheKey, result)
      } catch (err) {
        console.warn("Gagal menyimpan summary ke localStorage:", err)
      }
    } catch (err) {
      console.error("Gagal generate AI summary:", err)
      setError(err.message || "Terjadi kesalahan saat memproses ringkasan AI.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!summary) return
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border border-indigo-100/90 dark:border-indigo-900/60 rounded-2xl p-4 sm:p-5 shadow-sm transition-all">
      {/* Header Kartu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
            {isBabAkhir ? <Award className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-1.5">
                <span>AI Tutor & Rangkuman Cerdas</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {isBabAkhir ? "Rangkuman Semua Bab" : `Bab ${currentBagianIndex + 1}`}
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBabAkhir
                ? "Menjelaskan bab penutup & merangkum seluruh bab materi ini agar siap kuis."
                : `Penjelasan konsep inti & kesimpulan penting untuk Bab ${currentBagianIndex + 1}.`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {summary && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg"
                title="Salin Rangkuman"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                    <span className="text-emerald-600 font-bold">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    <span>Salin</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => handleGenerate(true)}
                className="h-8 px-2.5 text-xs rounded-lg gap-1.5 font-semibold border-indigo-200 hover:bg-indigo-50 text-indigo-700"
                title="Perbarui / Generate Ulang"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-800"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Konten Belum Di-generate */}
      {!summary && !loading && !error && (
        <div className="mt-4 pt-3.5 border-t border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-950/50 p-3.5 sm:p-4 rounded-xl border border-indigo-50 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Ingin penjelasan ringkas dan rangkuman poin penting {isBabAkhir ? "seluruh bab" : "bab ini"} yang mudah dipahami?
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleGenerate(false)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl h-9 px-4 shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>{isBabAkhir ? "Rangkum Semua Bab (AI)" : "Jelaskan & Rangkum Bab Ini"}</span>
          </button>
        </div>
      )}

      {/* Indikator Loading */}
      {loading && (
        <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center justify-center py-6 text-center space-y-2.5">
          <div className="w-8 h-8 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {isBabAkhir
              ? "AI sedang merangkum komprehensif seluruh bab materi..."
              : `AI sedang menganalisis dan menyusun penjelasan untuk Bab ${currentBagianIndex + 1}...`}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Hasil akan disimpan otomatis di cache sehingga hemat kuota & instan dibuka kembali.
          </p>
        </div>
      )}

      {/* Pesan Error */}
      {error && !loading && (
        <div className="mt-4 pt-3 border-t border-red-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-red-50 text-red-800 p-3 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleGenerate(true)}
            className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-100 shrink-0"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Konten Rangkuman Markdown */}
      {summary && isExpanded && !loading && (
        <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/50">
          <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950 rounded-xl p-4 sm:p-5 prose prose-indigo max-w-none text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 shadow-2xs">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => <h3 className="font-extrabold text-base text-indigo-950 dark:text-indigo-200 mb-2 mt-4 first:mt-0" {...props} />,
                h2: ({ node, ...props }) => <h4 className="font-bold text-sm sm:text-base text-indigo-900 dark:text-indigo-300 mb-2 mt-3 first:mt-0" {...props} />,
                h3: ({ node, ...props }) => <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 mb-1.5 mt-2.5" {...props} />,
                p: ({ node, ...props }) => <p className="mb-2.5 text-slate-700 dark:text-slate-300 leading-relaxed" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2.5 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2.5 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
                li: ({ node, ...props }) => <li className="pl-0.5" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-bold text-indigo-950 dark:text-white" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 pl-3 py-1 my-2 rounded-r-lg italic text-slate-600 dark:text-slate-300" {...props} />
                ),
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tersimpan di cache lokal (bebas akses tanpa boros token)
            </span>
            <span className="text-slate-400">Powered by Gemini AI</span>
          </div>
        </div>
      )}
    </div>
  )
}
