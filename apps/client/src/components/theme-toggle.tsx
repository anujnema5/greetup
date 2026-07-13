"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"

type ButtonVariantProps = VariantProps<typeof buttonVariants>

export type ThemeToggleProps = {
  className?: string
  align?: "start" | "center" | "end"
  variant?: ButtonVariantProps["variant"]
  size?: ButtonVariantProps["size"]
}

export function ThemeToggle({
  className,
  align = "end",
  variant = "outline",
  size = "icon",
}: ThemeToggleProps) {
  const { setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent",
          size === "icon-lg" && "size-10 rounded-xl",
          size === "icon-sm" && "size-8",
          (size === "icon" || size == null) && "size-9",
          className
        )}
        aria-hidden
      />
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn("relative shrink-0", className)}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Theme: choose light, dark, or system</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} sideOffset={6}>
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
