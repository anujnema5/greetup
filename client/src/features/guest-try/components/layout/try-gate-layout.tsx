"use client";

import type { ReactNode } from "react";

import { TryBackButton } from "../ui/try-back-button";
import type { TryBackTarget } from "../../types/guest-try.types";

type TryGateLayoutProps = {
  title: string;
  description: string;
  children?: ReactNode;
  actions: ReactNode;
  back?: TryBackTarget;
};

/** Open gate layout — single column, left-aligned with page header. */
export function TryGateLayout({ title, description, children, actions, back }: TryGateLayoutProps) {
  return (
    <div className="relative w-full max-w-xl">
      <div
        className="pointer-events-none absolute -left-16 top-[20%] h-[min(420px,50vh)] w-[min(560px,90vw)] rounded-full bg-[radial-gradient(circle,oklch(88%_0.11_105/0.09)_0%,transparent_68%)] blur-2xl lg:-left-24"
        aria-hidden
      />

      <div className="relative flex w-full flex-col text-left">
        {back ? (
          <div className="mb-5 sm:mb-6">
            <TryBackButton back={back} appearance="link" className="-ml-1 w-fit px-1" />
          </div>
        ) : null}

        <header>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary/75 sm:text-xs">
            Guest try
          </p>
          <h1 className="mt-3 text-[1.65rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-3xl lg:text-[2.125rem]">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        </header>

        {children ? <div className="mt-8 sm:mt-9">{children}</div> : null}

        <div className="mt-8 w-full max-w-xl sm:mt-9">{actions}</div>
      </div>
    </div>
  );
}
