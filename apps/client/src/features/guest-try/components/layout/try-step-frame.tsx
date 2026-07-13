"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { TryBackButton } from "../ui/try-back-button";
import type { TryBackTarget } from "../../types/guest-try.types";

type TryStepFrameProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  align?: "start" | "center";
  width?: "full" | "narrow" | "wide";
  back?: TryBackTarget;
  backLabel?: string;
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
  back,
  backLabel,
}: TryStepFrameProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        width === "narrow" && "max-w-xl",
        width === "wide" && "w-full",
        className,
      )}
    >
      {back ? (
        <nav aria-label="Step navigation" className="mb-4 sm:mb-5">
          <TryBackButton back={back} appearance="link" label={backLabel} className="-ml-1 w-fit px-1" />
        </nav>
      ) : null}

      {title || description || Icon ? (
        <header className={cn("mb-5 sm:mb-6", centered && "mx-auto max-w-md text-center")}>
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
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          ) : null}
          {description ? (
            <p
              className={cn(
                "mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]",
                centered && "mx-auto max-w-sm",
                !centered && width === "narrow" && "max-w-lg",
                !centered && width === "wide" && "max-w-2xl",
                !centered && width === "full" && "max-w-2xl",
              )}
            >
              {description}
            </p>
          ) : null}
        </header>
      ) : null}

      <div className="min-w-0 flex-1">{children}</div>

      {footer ? <footer className="mt-6 sm:mt-7">{footer}</footer> : null}
    </div>
  );
}
