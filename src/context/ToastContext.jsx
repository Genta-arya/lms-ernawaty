import React, { createContext, useContext, useState, useCallback } from "react"
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Trash2,
} from "lucide-react"

const ToastContext = createContext(null)

// Global reference untuk pemanggilan di luar komponen React jika diperlukan
let globalToastHandler = null

export const toast = {
  success: (title, desc = "") => globalToastHandler?.addToast("success", title, desc),
  error: (title, desc = "") => globalToastHandler?.addToast("error", title, desc),
  warning: (title, desc = "") => globalToastHandler?.addToast("warning", title, desc),
  info: (title, desc = "") => globalToastHandler?.addToast("info", title, desc),
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmDialog, setConfirmDialog] = useState(null)

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((type, title, desc = "", duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    const newToast = { id, type, title, desc, duration }

    setToasts((prev) => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [removeToast])

  // Menetapkan handler global
  globalToastHandler = { addToast }

  // Fungsi helper konfirmasi elegan (pengganti window.confirm)
  const confirmAction = useCallback(
    ({
      title = "Konfirmasi Aksi",
      message = "Apakah Anda yakin ingin melanjutkan tindakan ini?",
      confirmText = "Ya, Lanjutkan",
      cancelText = "Batal",
      variant = "danger", // 'danger' | 'primary'
      onConfirm,
    }) => {
      setConfirmDialog({
        title,
        message,
        confirmText,
        cancelText,
        variant,
        onConfirm: async () => {
          setConfirmDialog(null)
          if (typeof onConfirm === "function") {
            await onConfirm()
          }
        },
      })
    },
    []
  )

  const value = {
    toast: {
      success: (title, desc) => addToast("success", title, desc),
      error: (title, desc) => addToast("error", title, desc),
      warning: (title, desc) => addToast("warning", title, desc),
      info: (title, desc) => addToast("info", title, desc),
    },
    confirmAction,
  }

  const toastIcons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  }

  const toastBorders = {
    success: "border-emerald-200/90 shadow-emerald-500/10 bg-white/95 text-emerald-950",
    error: "border-rose-200/90 shadow-rose-500/10 bg-white/95 text-rose-950",
    warning: "border-amber-200/90 shadow-amber-500/10 bg-white/95 text-amber-950",
    info: "border-blue-200/90 shadow-blue-500/10 bg-white/95 text-blue-950",
  }

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Kontainer Notifikasi Mengambang (Floating Toasts) Murni Tailwind CSS */}
      <aside
        aria-label="Notifikasi Sistem"
        className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-2xl border p-4 shadow-xl backdrop-blur-md flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-3 duration-200 ${
              toastBorders[t.type] || toastBorders.info
            }`}
          >
            <div className="mt-0.5">{toastIcons[t.type] || toastIcons.info}</div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="text-xs sm:text-sm font-black tracking-tight text-slate-900 leading-snug">
                {t.title}
              </div>
              {t.desc && (
                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed break-words">
                  {t.desc}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors shrink-0 -mr-1 -mt-1"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </aside>

      {/* Dialog Konfirmasi Elegan Murni Tailwind CSS */}
      {confirmDialog && (
        <div className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmDialog.variant === "danger"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {confirmDialog.variant === "danger" ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 tracking-tight">
                  {confirmDialog.title}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {confirmDialog.message}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all active:scale-95 ${
                  confirmDialog.variant === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
