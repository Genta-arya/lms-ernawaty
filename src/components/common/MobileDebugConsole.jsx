import React, { useState, useEffect } from "react"
import { Terminal, X, Copy, Trash2, Check, AlertCircle, AlertTriangle, Info } from "lucide-react"

/**
 * MobileDebugConsole
 * Menginspeksi error, warning, dan log langsung di layar tablet/HP tanpa perlu laptop/F12.
 * Diaktifkan lewat URL query parameter ?debug=true ATAU tombol mengambang kecil di pojok.
 */
export function MobileDebugConsole() {
  const [logs, setLogs] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState("all") // all | error | warn

  useEffect(() => {
    // Tangkap window error yang tidak ter-handle
    const handleError = (event) => {
      const errItem = {
        id: Date.now() + Math.random(),
        type: "error",
        time: new Date().toLocaleTimeString("id-ID"),
        message: event.message || "Unknown error",
        stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
      }
      setLogs((prev) => [errItem, ...prev].slice(0, 100))
    }

    // Tangkap Promise rejection yang tidak di-catch
    const handleUnhandledRejection = (event) => {
      const reason = event.reason
      const errItem = {
        id: Date.now() + Math.random(),
        type: "error",
        time: new Date().toLocaleTimeString("id-ID"),
        message: reason?.message || String(reason) || "Unhandled Promise Rejection",
        stack: reason?.stack || "",
      }
      setLogs((prev) => [errItem, ...prev].slice(0, 100))
    }

    // Tangkap console.error bawaan
    const originalConsoleError = console.error
    console.error = (...args) => {
      originalConsoleError.apply(console, args)
      const msg = args
        .map((a) => {
          if (a instanceof Error) return `${a.message}\n${a.stack || ""}`
          if (typeof a === "object") {
            try {
              return JSON.stringify(a, null, 2)
            } catch (_) {
              return String(a)
            }
          }
          return String(a)
        })
        .join(" ")

      const errItem = {
        id: Date.now() + Math.random(),
        type: "error",
        time: new Date().toLocaleTimeString("id-ID"),
        message: msg,
      }
      setLogs((prev) => [errItem, ...prev].slice(0, 100))
    }

    // Tangkap console.warn bawaan
    const originalConsoleWarn = console.warn
    console.warn = (...args) => {
      originalConsoleWarn.apply(console, args)
      const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")
      const warnItem = {
        id: Date.now() + Math.random(),
        type: "warn",
        time: new Date().toLocaleTimeString("id-ID"),
        message: msg,
      }
      setLogs((prev) => [warnItem, ...prev].slice(0, 100))
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    // Buka otomatis jika ada parameter ?debug=true di URL
    if (window.location.search.includes("debug=true")) {
      setIsOpen(true)
    }

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
    }
  }, [])

  const errorCount = logs.filter((l) => l.type === "error").length
  const filteredLogs = logs.filter((l) => (filter === "all" ? true : l.type === filter))

  const handleCopyAll = () => {
    const text = logs
      .map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}\n${l.stack || ""}`)
      .join("\n----------------\n")
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      {/* Tombol Melayang Kecil Pengaktif Console Debug di Layar Tablet (Pojok Kanan Tengah) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`fixed right-3 bottom-24 md:bottom-20 z-[999999] flex items-center gap-1.5 px-3 py-2 rounded-full shadow-2xl backdrop-blur-md border text-xs font-black transition-all active:scale-95 ${
            errorCount > 0
              ? "bg-rose-600/90 text-white border-rose-400 animate-pulse"
              : "bg-slate-900/80 text-slate-300 border-slate-700 hover:text-white"
          }`}
          title="Buka Console Debugger Layar"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Console</span>
          {errorCount > 0 && (
            <span className="bg-white text-rose-600 px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {errorCount}
            </span>
          )}
        </button>
      )}

      {/* Jendela Panel Debugger Layar Sentuh Tablet */}
      {isOpen && (
        <div className="fixed inset-x-2 sm:inset-x-6 bottom-2 z-[9999999] max-h-[75vh] flex flex-col rounded-3xl bg-slate-950/95 border border-slate-800 text-slate-100 shadow-2xl backdrop-blur-2xl overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header Panel */}
          <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-2">
                  <span>Tablet Error Inspector</span>
                  {errorCount > 0 && (
                    <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {errorCount} Error
                    </span>
                  )}
                </h3>
              </div>
            </div>

            {/* Aksi Salin, Bersihkan, Tutup */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyAll}
                disabled={logs.length === 0}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-700 active:scale-95 transition-all"
                title="Salin seluruh isi log untuk dikirimkan ke chat"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Tersalin!" : "Salin Log"}</span>
              </button>

              <button
                type="button"
                onClick={() => setLogs([])}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Bersihkan Log"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Tutup Panel Debugger"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tab */}
          <div className="px-3 py-1.5 border-b border-slate-800/80 bg-slate-900/30 flex items-center gap-2 text-[11px] shrink-0">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                filter === "all" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Semua ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("error")}
              className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                filter === "error" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Error ({errorCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("warn")}
              className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                filter === "warn" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Warning ({logs.filter((l) => l.type === "warn").length})
            </button>
          </div>

          {/* Isi Pesan Error */}
          <div className="p-3 sm:p-4 overflow-y-auto overscroll-contain flex-1 font-mono text-[11px] space-y-2 select-text">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-500 space-y-1">
                <Info className="w-6 h-6 mx-auto opacity-50" />
                <p>Tidak ada error atau warning yang terdeteksi saat ini.</p>
                <p className="text-[10px] text-slate-600">
                  Lakukan aksi di aplikasi; bila terjadi error, detailnya akan langsung tercatat di sini.
                </p>
              </div>
            ) : (
              filteredLogs.map((item) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border leading-relaxed break-words ${
                    item.type === "error"
                      ? "bg-rose-950/40 border-rose-900/60 text-rose-200"
                      : "bg-amber-950/40 border-amber-900/60 text-amber-200"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75 mb-1">
                    <span className="font-bold flex items-center gap-1 uppercase">
                      {item.type === "error" ? (
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                      )}
                      {item.type}
                    </span>
                    <span>{item.time}</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-100">
                    {item.message}
                  </pre>
                  {item.stack && (
                    <pre className="mt-1.5 pt-1.5 border-t border-rose-900/40 whitespace-pre-wrap text-[10px] opacity-60">
                      {item.stack}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}
