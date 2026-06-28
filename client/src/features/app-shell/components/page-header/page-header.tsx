"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

import type { PageHeaderProps } from "../../types/page-header.types";
import { PageHeaderToolbar } from "./page-header-toolbar";

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Go back",
  actions,
  className,
  titleClassName,
  subtitleClassName,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md lg:px-5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {backHref ? (
          <Link
            href={backHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={backLabel}
          >
            <ArrowLeft size={18} />
          </Link>
        ) : null}

        <div className="min-w-0">
          <h1
            className={cn(
              "truncate text-[15px] font-semibold leading-none text-foreground",
              titleClassName,
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className={cn("mt-1 truncate text-[11px] text-muted-foreground", subtitleClassName)}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {actions}
        <PageHeaderToolbar />
      </div>
    </header>
  );
}
