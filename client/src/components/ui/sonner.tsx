"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system", resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border px-3.5 py-2.5 min-h-0 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur supports-[backdrop-filter]:bg-[var(--normal-bg)] bg-[var(--normal-bg)] border-[var(--normal-border)] text-[var(--normal-text)]",
          title: "text-sm font-semibold leading-5 text-[var(--normal-text)]",
          description: "text-xs text-[var(--muted-text)] mt-0.5 leading-4",
          closeButton:
            "border-white/15 bg-white/5 text-white/70 hover:text-white hover:bg-white/10",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          // Keep Circlo's black toast aesthetic, tuned per mode for contrast.
          "--normal-bg": isDark ? "rgba(9, 9, 11, 0.92)" : "rgba(0, 0, 0, 0.9)",
          "--normal-text": "rgb(255 255 255)",
          "--muted-text": isDark ? "rgba(255, 255, 255, 0.72)" : "rgba(255, 255, 255, 0.78)",
          "--normal-border": isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.16)",
          "--border-radius": "1rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
