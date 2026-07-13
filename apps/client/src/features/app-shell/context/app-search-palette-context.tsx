"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AppSearchPaletteContextValue = {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
};

const AppSearchPaletteContext = createContext<AppSearchPaletteContextValue | null>(null);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function AppSearchPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);
  const togglePalette = useCallback(() => setOpen((current) => !current), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      togglePalette();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePalette]);

  const value = useMemo(
    () => ({ open, openPalette, closePalette, togglePalette }),
    [closePalette, open, openPalette, togglePalette],
  );

  return (
    <AppSearchPaletteContext.Provider value={value}>
      {children}
    </AppSearchPaletteContext.Provider>
  );
}

export function useAppSearchPalette() {
  const ctx = useContext(AppSearchPaletteContext);
  if (!ctx) {
    throw new Error("useAppSearchPalette must be used within AppSearchPaletteProvider");
  }
  return ctx;
}
