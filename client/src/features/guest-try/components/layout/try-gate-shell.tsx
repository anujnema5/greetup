"use client";

import type { ReactNode } from "react";

import { TryLayout } from "./try-layout";

type TryGateShellProps = {
  children: ReactNode;
};

export function TryGateShell({ children }: TryGateShellProps) {
  return (
    <TryLayout showTagline={false}>
      <div className="w-full pb-10 pt-6 sm:pb-12 sm:pt-8 lg:pt-12">{children}</div>
    </TryLayout>
  );
}
