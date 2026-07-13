import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageContentHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Page title block below the global search topbar (Explore-style). */
export function PageContentHeader({
  title,
  subtitle,
  actions,
  className,
}: PageContentHeaderProps) {
  return (
    <header className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-[26px] font-extrabold tracking-tight text-foreground">{title}</h1>
        {subtitle ? (
          <p className="text-[15px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
