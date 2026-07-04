import { cn } from "@/lib/utils";

/**
 * Form dialogs with inputs: bottom sheet on phones, centered on `sm+`.
 * Pair with `dialog-form-sheet` so `DialogContent` uses bottom keyboard inset only on narrow viewports.
 *
 * Mobile height uses `svh` + `dvh` so the shell does not collapse when the keyboard opens;
 * `use-dialog-visual-viewport-style` lifts the sheet above the keyboard instead.
 *
 * Important: never use `bottom-0!` here — `!important` beats `sm:bottom-auto` and breaks desktop centering.
 */
export function formDialogShellClass(options?: { maxWidthClass?: string }) {
  const maxWidth = options?.maxWidthClass ?? "sm:max-w-lg";
  return cn(
    "dialog-form-sheet",
    "flex min-h-0 w-full flex-col gap-0 overflow-hidden p-0",
    // Phone / narrow: bottom sheet (max-sm only — desktop keeps DialogContent centering)
    "max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-auto",
    "max-sm:max-h-[min(92svh,92dvh,880px)] max-sm:max-w-[100vw]",
    "max-sm:translate-x-0 max-sm:translate-y-0",
    "max-sm:rounded-t-[1.75rem] max-sm:rounded-b-none max-sm:border-b-0",
    // Tablet / desktop: classic centered dialog
    "sm:max-h-[min(90dvh,760px)] sm:rounded-2xl",
    maxWidth,
  );
}

export const formDialogScrollBodyClass = cn(
  "app-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain",
  "[-webkit-overflow-scrolling:touch] touch-pan-y",
  "[overflow-anchor:none]",
);

export const formDialogFooterClass = cn(
  "shrink-0 border-t border-border/60 bg-card/95 backdrop-blur-sm",
  "max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6",
);
