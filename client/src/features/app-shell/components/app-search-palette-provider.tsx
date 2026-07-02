"use client";

import type { ReactNode } from "react";

import { AppSearchPaletteProvider } from "../context/app-search-palette-context";
import { AppSearchPaletteDialog } from "./app-search-palette-dialog";

/** Global search palette (sidebar, ⌘K / Ctrl+K) available on all realtime app pages. */
export function AppSearchPaletteRoot({ children }: { children: ReactNode }) {
  return (
    <AppSearchPaletteProvider>
      {children}
      <AppSearchPaletteDialog />
    </AppSearchPaletteProvider>
  );
}
