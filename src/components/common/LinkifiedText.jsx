import React from "react"
import { ExternalLink } from "lucide-react"

// Regex untuk mendeteksi URL (http, https, www, atau domain umum)
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi

/**
 * Komponen pembantu untuk merender teks chat yang otomatis mengubah link / URL
 * menjadi tag <a href="..." target="_blank" rel="noopener noreferrer"> yang dapat langsung diklik.
 */
export function LinkifiedText({ text = "", className = "", linkClassName = "" }) {
  if (!text || typeof text !== "string") return null

  // Pecah string berdasarkan URL
  const parts = text.split(URL_REGEX)

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(URL_REGEX)) {
          let href = part
          if (!href.startsWith("http://") && !href.startsWith("https://")) {
            href = `https://${href}`
          }

          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`underline underline-offset-2 break-all inline-flex items-baseline gap-0.5 font-bold transition-all hover:opacity-80 active:opacity-100 ${
                linkClassName || "text-sky-300 hover:text-sky-200"
              }`}
            >
              <span>{part}</span>
              <ExternalLink className="w-2.5 h-2.5 inline shrink-0 self-center opacity-80" />
            </a>
          )
        }
        return <React.Fragment key={index}>{part}</React.Fragment>
      })}
    </span>
  )
}

