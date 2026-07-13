"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type SearchDropdownPortalProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
};

/** Positions the search dropdown below the input and closes on backdrop click or Escape. */
export function SearchDropdownPortal({
  open,
  onClose,
  anchorRef,
  children,
}: SearchDropdownPortalProps) {
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || !position || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close search results"
        className="fixed inset-0 z-40 bg-background/40"
        onMouseDown={onClose}
      />
      <div
        className="fixed z-50 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
        }}
        onMouseDown={(event) => event.preventDefault()}
      >
        <div className="max-h-[min(400px,55vh)] overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </>,
    document.body,
  );
}
