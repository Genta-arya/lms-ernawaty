import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Skeleton shimmer dasar — balok abu-abu dengan efek shimmer halus
 */
function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-slate-200/80 relative overflow-hidden",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.5s_ease-in-out_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }

