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
  const { resolvedTheme } = useTheme()
  const sonnerTheme = resolvedTheme === "light" ? "light" : "dark"

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast w-full rounded-2xl border-0 bg-popover px-4 py-3 text-popover-foreground !shadow-lg backdrop-blur-sm",
          title: "text-sm font-semibold leading-5 text-foreground",
          description: "text-xs leading-4 text-muted-foreground",
          actionButton:
            "rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground",
          cancelButton:
            "rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground",
          closeButton:
            "absolute right-2 top-2 rounded-md border border-border bg-muted/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-primary" />,
        warning: <TriangleAlertIcon className="size-4 text-secondary-foreground" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
