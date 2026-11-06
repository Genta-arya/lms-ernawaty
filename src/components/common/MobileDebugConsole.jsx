import React, { useState, useEffect } from "react"
import {
  Terminal,
  Globe,
  X,
  Copy,
  Trash2,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Code2,
  Send,
  FileJson,
} from "lucide-react"

/**
 * MobileDebugConsole
 * Menginspeksi Error, Warning, dan Network Request (Fetch / XHR)
 * LENGKAP dengan Payload (Request Body) dan Response Data (JSON/Text).
 * HANYA aktif jika ada URL parameter ?debug=true (atau tersimpan di sessionStorage).
 */
export function MobileDebugConsole() {
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [activeTab, setActiveTab] = useState("console") // 'console' | 'network'
  const [logs, setLogs] = useState([])
  const [requests, setRequests] = useState([])
  const [expandedReqId, setExpandedReqId] = useState(null)
  const [reqDetailTab, setReqDetailTab] = useState({}) // reqId -> 'response' | 'payload' | 'headers'
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [consoleFilter, setConsoleFilter] = useState("all") // all | error | warn
  const [networkFilter, setNetworkFilter] = useState("all") // all | failed | success

  useEffect(() => {
    // 1. Cek izin mode debug (?debug=true)
    const urlParams = new URLSearchParams(window.location.search)
    const hasDebugParam =
      urlParams.get("debug") === "true" || sessionStorage.getItem("app_debug_mode") === "true"

    if (!hasDebugParam) {
      return
    }

    setIsDebugMode(true)
    sessionStorage.setItem("app_debug_mode", "true")
    setIsOpen(true)

    // 2. Intercept Global Window Errors & Promise Rejections
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

    // 3. Intercept console.error & console.warn
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

    // Helper untuk memformat payload
    function parsePayload(body) {
      if (!body) return null
      if (typeof body === "string") {
        try {
          return JSON.stringify(JSON.parse(body), null, 2)
        } catch (_) {
          return body
        }
      }
      if (typeof FormData !== "undefined" && body instanceof FormData) {
        try {
          const entries = {}
          for (const [key, value] of body.entries()) {
            if (value instanceof File) {
              entries[key] = `[File: ${value.name} (${value.type || "unknown"}, ${value.size} bytes)]`
            } else if (value instanceof Blob) {
              entries[key] = `[Blob: (${value.type || "unknown"}, ${value.size} bytes)]`
            } else {
              entries[key] = value
            }
          }
          return JSON.stringify(entries, null, 2)
        } catch (_) {
          return "[FormData object]"
        }
      }
      if (typeof Blob !== "undefined" && body instanceof Blob) {
        return `[Blob: ${body.type || "unknown"}, ${body.size} bytes]`
      }
      if (typeof body === "object") {
        try {
          return JSON.stringify(body, null, 2)
        } catch (_) {
          return String(body)
        }
      }
      return String(body)
    }

    // 4. Intercept window.fetch (Lengkap dengan Payload & Clone Response Body)
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = performance.now()
      let url = args[0]
      if (typeof url === "object" && url.url) url = url.url
      url = String(url)

      const options = args[1] || {}
      const method = (options.method || "GET").toUpperCase()
      const reqId = Date.now() + Math.random()

      // Ambil Request Payload
      const requestPayload = parsePayload(options.body)

      const newReq = {
        id: reqId,
        url,
        method,
        status: "pending",
        statusCode: 0,
        duration: 0,
        time: new Date().toLocaleTimeString("id-ID"),
        payload: requestPayload,
        response: null,
        error: null,
      }

      setRequests((prev) => [newReq, ...prev].slice(0, 80))

      let response
      try {
        response = await originalFetch.apply(window, args)
      } catch (err) {
        const duration = Math.round(performance.now() - startTime)
        setRequests((prev) =>
          prev.map((r) =>
            r.id === reqId
              ? {
                  ...r,
                  status: "failed",
                  statusCode: 0,
                  duration,
                  error: err.message || "Network Error / Connection Failed",
                }
              : r
          )
        )
        throw err
      }

      const duration = Math.round(performance.now() - startTime)
      const ok = response.ok

      // Clone response secara non-blocking agar tidak mengganggu stream pemanggil asli
      try {
        const clone = response.clone()
        const contentType = clone.headers.get("content-type") || ""
        if (contentType.includes("application/json") || contentType.includes("text/")) {
          clone.text().then((text) => {
            const responseBody = parsePayload(text)
            setRequests((prev) =>
              prev.map((r) =>
                r.id === reqId
                  ? {
                      ...r,
                      status: ok ? "success" : "failed",
                      statusCode: response.status,
                      duration,
                      response: responseBody,
                    }
                  : r
              )
            )
          }).catch(() => {})
        } else {
          const responseBody = `[Binary/Stream data: ${contentType}]`
          setRequests((prev) =>
            prev.map((r) =>
              r.id === reqId
                ? {
                    ...r,
                    status: ok ? "success" : "failed",
                    statusCode: response.status,
                    duration,
                    response: responseBody,
                  }
                : r
            )
          )
        }
      } catch (_) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === reqId
              ? {
                  ...r,
                  status: ok ? "success" : "failed",
                  statusCode: response.status,
                  duration,
                  response: "[Tidak dapat membaca response]",
                }
              : r
          )
        )
      }

      return response
    }

    // 5. Intercept XMLHttpRequest (XHR Lengkap dengan Payload & Response)
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this._debugMethod = (method || "GET").toUpperCase()
      this._debugUrl = String(url)
      this._debugReqId = Date.now() + Math.random()
      this._debugStartTime = performance.now()
      return originalXHROpen.apply(this, [method, url, ...rest])
    }

    XMLHttpRequest.prototype.send = function (...args) {
      const reqId = this._debugReqId
      const method = this._debugMethod || "GET"
      const url = this._debugUrl || ""
      const startTime = this._debugStartTime || performance.now()
      const payload = parsePayload(args[0])

      const newReq = {
        id: reqId,
        url,
        method,
        status: "pending",
        statusCode: 0,
        duration: 0,
        time: new Date().toLocaleTimeString("id-ID"),
        payload,
        response: null,
        error: null,
      }
      setRequests((prev) => [newReq, ...prev].slice(0, 80))

      this.addEventListener("loadend", () => {
        const duration = Math.round(performance.now() - startTime)
        const status = this.status
        const ok = status >= 200 && status < 400

        let responseBody = null
        try {
          if (this.responseType === "" || this.responseType === "text") {
            responseBody = parsePayload(this.responseText)
          } else if (this.responseType === "json") {
            responseBody = JSON.stringify(this.response, null, 2)
          } else {
            responseBody = `[Response Type: ${this.responseType}]`
          }
        } catch (_) {
          responseBody = "[Gagal membaca XHR response text]"
        }

        setRequests((prev) =>
          prev.map((r) =>
            r.id === reqId
              ? {
                  ...r,
                  status: ok ? "success" : "failed",
                  statusCode: status,
                  duration,
                  response: responseBody,
                  error: !ok ? `HTTP Error ${status}` : null,
                }
              : r
          )
        )
      })

      this.addEventListener("error", () => {
        const duration = Math.round(performance.now() - startTime)
        setRequests((prev) =>
          prev.map((r) =>
            r.id === reqId
              ? {
                  ...r,
                  status: "failed",
                  statusCode: 0,
                  duration,
                  error: "XHR Network Error",
                }
              : r
          )
        )
      })

      return originalXHRSend.apply(this, args)
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
      window.fetch = originalFetch
      XMLHttpRequest.prototype.open = originalXHROpen
      XMLHttpRequest.prototype.send = originalXHRSend
    }
  }, [])

  if (!isDebugMode) return null

  const errorCount = logs.filter((l) => l.type === "error").length
  const failedReqCount = requests.filter((r) => r.status === "failed").length

  const filteredLogs = logs.filter((l) => (consoleFilter === "all" ? true : l.type === consoleFilter))
  const filteredRequests = requests.filter((r) => {
    if (networkFilter === "all") return true
    if (networkFilter === "failed") return r.status === "failed"
    if (networkFilter === "success") return r.status === "success"
    return true
  })

  const toggleExpand = (id) => {
    setExpandedReqId((prev) => (prev === id ? null : id))
  }

  const handleCopyAll = () => {
    let text = ""
    if (activeTab === "console") {
      text = logs
        .map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}\n${l.stack || ""}`)
        .join("\n----------------\n")
    } else {
      text = requests
        .map(
          (r) =>
            `[${r.time}] [${r.method}] ${r.statusCode || r.status} (${r.duration}ms)\nURL: ${r.url}${
              r.payload ? `\n\n--- PAYLOAD ---\n${r.payload}` : ""
            }${r.response ? `\n\n--- RESPONSE ---\n${r.response}` : ""}${
              r.error ? `\n\n--- ERROR ---\n${r.error}` : ""
            }`
        )
        .join("\n====================================\n")
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCopySingle = (content) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleExitDebug = () => {
    sessionStorage.removeItem("app_debug_mode")
    setIsDebugMode(false)
    setIsOpen(false)
  }

  return (
    <>
      {/* Tombol Melayang Kecil Pengaktif Console Debug di Layar Tablet (Pojok Kanan Tengah) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`fixed right-3 bottom-24 md:bottom-20 z-[999999] flex items-center gap-1.5 px-3 py-2 rounded-full shadow-2xl backdrop-blur-md border text-xs font-black transition-all active:scale-95 ${
            errorCount > 0 || failedReqCount > 0
              ? "bg-rose-600/95 text-white border-rose-400 animate-pulse"
              : "bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white"
          }`}
          title="Buka Console & Network Inspector"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Inspector</span>
          {(errorCount > 0 || failedReqCount > 0) && (
            <span className="bg-white text-rose-600 px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {errorCount + failedReqCount}
            </span>
          )}
        </button>
      )}

      {/* Jendela Panel Debugger Layar Sentuh Tablet */}
      {isOpen && (
        <div className="fixed inset-x-2 sm:inset-x-6 bottom-2 z-[9999999] max-h-[82vh] flex flex-col rounded-3xl bg-slate-950/95 border border-slate-800 text-slate-100 shadow-2xl backdrop-blur-2xl overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header Panel */}
          <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/70 shrink-0">
            {/* Tab Navigasi: Console vs Network */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("console")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${
                  activeTab === "console"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white bg-slate-800/60"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Console</span>
                {errorCount > 0 && (
                  <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[9px] font-black">
                    {errorCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("network")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${
                  activeTab === "network"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white bg-slate-800/60"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Network (Payload &amp; Response)</span>
                {failedReqCount > 0 && (
                  <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[9px] font-black">
                    {failedReqCount}
                  </span>
                )}
              </button>
            </div>

            {/* Aksi Salin, Bersihkan, Tutup */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyAll}
                disabled={activeTab === "console" ? logs.length === 0 : requests.length === 0}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-700 active:scale-95 transition-all"
                title="Salin seluruh isi log untuk dikirimkan ke chat"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Tersalin!" : "Salin Log"}</span>
              </button>

              <button
                type="button"
                onClick={() => (activeTab === "console" ? setLogs([]) : setRequests([]))}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Bersihkan Log"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleExitDebug}
                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
                title="Keluar dari mode debug dan sembunyikan inspector"
              >
                Keluar Debug
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Tutup Panel Sementara"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub Filter Tab */}
          <div className="px-3 py-1.5 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between text-[11px] shrink-0">
            {activeTab === "console" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConsoleFilter("all")}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                    consoleFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Semua ({logs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setConsoleFilter("error")}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                    consoleFilter === "error" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Error ({errorCount})
                </button>
                <button
                  type="button"
                  onClick={() => setConsoleFilter("warn")}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                    consoleFilter === "warn" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Warning ({logs.filter((l) => l.type === "warn").length})
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNetworkFilter("all")}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                    networkFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Semua ({requests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNetworkFilter("failed")}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                    networkFilter === "failed" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Gagal ({failedReqCount})
                </button>
                <button
                  type="button"
                  onClick={() => setNetworkFilter("success")}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                    networkFilter === "success" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sukses ({requests.filter((r) => r.status === "success").length})
                </button>
              </div>
            )}
            <span className="text-[10px] text-slate-500 font-mono">
              {activeTab === "network" ? "Ketuk baris untuk melihat Payload & Response" : "Live Console Active"}
            </span>
          </div>

          {/* Isi Pesan (Tab Console vs Tab Network) */}
          <div className="p-3 sm:p-4 overflow-y-auto overscroll-contain flex-1 font-mono text-[11px] space-y-2 select-text">
            {activeTab === "console" ? (
              filteredLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-500 space-y-1">
                  <Info className="w-6 h-6 mx-auto opacity-50" />
                  <p>Tidak ada log atau error console yang tercatat.</p>
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
              )
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-10 text-slate-500 space-y-1">
                <Globe className="w-6 h-6 mx-auto opacity-50" />
                <p>Belum ada request Network (Fetch / XHR) yang terpantau.</p>
              </div>
            ) : (
              filteredRequests.map((req) => {
                const isExpanded = expandedReqId === req.id
                const currentDetailTab = reqDetailTab[req.id] || "response"

                return (
                  <div
                    key={req.id}
                    className={`rounded-2xl border text-[11px] leading-relaxed overflow-hidden transition-all ${
                      req.status === "failed"
                        ? "bg-rose-950/30 border-rose-900/60 text-rose-200"
                        : req.status === "pending"
                        ? "bg-blue-950/30 border-blue-900/60 text-blue-200"
                        : "bg-slate-900/50 border-slate-800 text-slate-200"
                    }`}
                  >
                    {/* Baris Ringkasan Request (Bisa Diklik untuk Expand) */}
                    <div
                      onClick={() => toggleExpand(req.id)}
                      className="p-3 cursor-pointer hover:bg-white/[0.03] flex items-start justify-between gap-2.5 transition-colors"
                    >
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div className="mt-0.5 text-slate-400 shrink-0">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-400" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-black px-1.5 py-0.5 rounded text-[9px] uppercase ${
                                req.method === "POST"
                                  ? "bg-blue-600 text-white"
                                  : req.method === "DELETE"
                                  ? "bg-rose-600 text-white"
                                  : "bg-slate-700 text-slate-200"
                              }`}
                            >
                              {req.method}
                            </span>
                            <span
                              className={`font-extrabold px-1.5 py-0.5 rounded text-[9px] ${
                                req.status === "failed"
                                  ? "bg-rose-600 text-white"
                                  : req.status === "pending"
                                  ? "bg-amber-600 text-white animate-pulse"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              {req.statusCode ? req.statusCode : req.status.toUpperCase()}
                            </span>
                            {req.duration > 0 && <span className="text-[10px] opacity-60 font-mono">{req.duration}ms</span>}
                            {req.payload && (
                              <span className="text-[9px] bg-slate-800 text-blue-300 px-1 py-0.5 rounded font-bold">
                                + Payload
                              </span>
                            )}
                            {req.response && (
                              <span className="text-[9px] bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-bold">
                                + Response
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-slate-300 break-all text-[11px] select-text">
                            {req.url}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] opacity-50 font-mono shrink-0">{req.time}</span>
                    </div>

                    {/* Panel Accordion Detail (Payload & Response Data) */}
                    {isExpanded && (
                      <div className="border-t border-slate-800/80 bg-slate-950/70 p-3 space-y-2.5 animate-in fade-in duration-150">
                        {/* Tab Selector Detail: Response vs Payload */}
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setReqDetailTab((prev) => ({ ...prev, [req.id]: "response" }))
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                currentDetailTab === "response"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-slate-400 hover:text-white bg-slate-900"
                              }`}
                            >
                              <FileJson className="w-3 h-3" />
                              <span>Response Body</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setReqDetailTab((prev) => ({ ...prev, [req.id]: "payload" }))
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                currentDetailTab === "payload"
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-slate-400 hover:text-white bg-slate-900"
                              }`}
                            >
                              <Send className="w-3 h-3" />
                              <span>Request Payload</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              const content =
                                currentDetailTab === "response"
                                  ? req.response || "No response"
                                  : req.payload || "No payload"
                              handleCopySingle(content)
                            }}
                            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white bg-slate-900 px-2 py-1 rounded-lg border border-slate-800"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Salin {currentDetailTab === "response" ? "Response" : "Payload"}</span>
                          </button>
                        </div>

                        {/* Konten Tab yang Dipilih */}
                        {currentDetailTab === "response" ? (
                          <div className="space-y-1">
                            {req.response ? (
                              <pre className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 font-mono text-[10px] overflow-x-auto max-h-48 whitespace-pre-wrap select-text leading-relaxed">
                                {req.response}
                              </pre>
                            ) : (
                              <div className="text-[10px] text-slate-500 italic py-2">
                                {req.status === "pending"
                                  ? "Sedang menunggu respon server..."
                                  : "Tidak ada data response body untuk request ini."}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {req.payload ? (
                              <pre className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-300 font-mono text-[10px] overflow-x-auto max-h-48 whitespace-pre-wrap select-text leading-relaxed">
                                {req.payload}
                              </pre>
                            ) : (
                              <div className="text-[10px] text-slate-500 italic py-2">
                                Request GET standar (Tidak memiliki payload request body).
                              </div>
                            )}
                          </div>
                        )}

                        {req.error && (
                          <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-300 text-[10px] font-bold">
                            ⚠️ Error: {req.error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </>
  )
}
