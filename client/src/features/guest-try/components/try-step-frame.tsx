"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TryStepFrameProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  align?: "start" | "center";
  width?: "full" | "narrow";
};

export function TryStepFrame({
  children,
  footer,
  className,
  icon: Icon,
  title,
  description,
  align = "start",
  width = "full",
}: TryStepFrameProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        width === "narrow" && "mx-auto max-w-lg",
        className,
      )}
    >
      {title || description || Icon ? (
        <header className={cn("mb-6 sm:mb-7", centered && "mx-auto max-w-md text-center")}>
          {Icon ? (
            <div
              className={cn(
                "mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary",
                centered && "mx-auto",
              )}
            >
              <Icon className="size-5" strokeWidth={2} aria-hidden />
            </div>
          ) : null}
          {title ? (
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
          ) : null}
          {description ? (
            <p
              className={cn(
                "mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]",
                centered && "mx-auto max-w-sm",
              )}
            >
              {description}
            </p>
          ) : null}
        </header>
      ) : null}

      <div className="min-w-0 flex-1">{children}</div>

      {footer ? (
        <footer className="mt-6 border-t border-white/5 pt-5 sm:mt-7">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
