import React, { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Komponen Avatar Siswa & Pengguna yang tahan error.
 * Jika URL foto kosong atau gagal dimuat (404 / 403 Google Auth image),
 * otomatis menampilkan inisial nama siswa dengan latar gradient modern.
 */
export function UserAvatar({
  fotoUrl,
  nama = "Siswa",
  className,
  fallbackClassName,
  textClassName,
  size = "md", // "sm" | "md" | "lg" | "xl"
}) {
  const [hasError, setHasError] = useState(false)

  const initial = (nama || "S").trim().charAt(0).toUpperCase()

  const sizeClasses = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-10 h-10 text-xs",
    lg: "w-14 h-14 sm:w-16 sm:h-16 text-xl sm:text-2xl",
    xl: "w-20 h-20 sm:w-24 sm:h-24 text-3xl sm:text-4xl",
  }

  const roundedClasses = {
    sm: "rounded-full",
    md: "rounded-xl",
    lg: "rounded-2xl",
    xl: "rounded-3xl",
  }

  const effectiveFoto = !hasError && fotoUrl ? fotoUrl : null

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden shrink-0 select-none shadow-xs transition-all",
        sizeClasses[size] || sizeClasses.md,
        roundedClasses[size] || roundedClasses.md,
        className
      )}
    >
      {effectiveFoto ? (
        <img
          src={effectiveFoto}
          alt={nama}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center font-black bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 text-white tracking-tight",
            fallbackClassName
          )}
        >
          <span className={cn(textClassName)}>{initial}</span>
        </div>
      )}
    </div>
  )
}

