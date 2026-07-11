/**
 * Force dark tokens for the in-call room shell (independent of app light/dark preference).
 * Include `text-foreground` so color re-resolves against `.dark` variables — otherwise
 * body (light theme) inherits its already-computed dark text into the call surface.
 */
export const CALL_ROOM_FORCED_DARK_CLASS = "dark text-foreground";

/** In-call chrome — always rendered inside {@link CALL_ROOM_FORCED_DARK_CLASS}. */

export const CALL_STAGE_SHELL_CLASS =
  "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-black/60 shadow-xl";

export const CALL_TOOLBAR_SHELL_CLASS =
  "pointer-events-auto z-30 w-full shrink-0 select-none rounded-xl border border-white/10 bg-[#0c0c0c]/88 pt-3 pb-[max(0.9rem,calc(0.5rem+env(safe-area-inset-bottom)))] shadow-[0_-10px_40px_-8px_rgb(0_0_0_/0.55)] backdrop-blur-2xl";

export const CALL_TOOLBAR_GLASS_BORDER_CLASS =
  "border border-white/14 backdrop-blur-[10px]";

export const CALL_TOOLBAR_GLASS_ACTIVE_CLASS =
  "bg-white/14 hover:bg-white/22";

export const CALL_TOOLBAR_GLASS_IDLE_CLASS =
  "bg-white/8 hover:bg-white/16";

export const CALL_TOOLBAR_CIRCLE_ACTIVE_CLASS =
  "bg-white/18 ring-1 ring-white/22 hover:bg-white/24";

export const CALL_TOOLBAR_CIRCLE_IDLE_CLASS =
  "bg-white/10 hover:bg-white/18";

export const CALL_TOOLBAR_ICON_ACTIVE_CLASS = "text-primary";
export const CALL_TOOLBAR_ICON_IDLE_CLASS = "text-white/75";
export const CALL_TOOLBAR_ICON_ON_CLASS = "text-white/90";
export const CALL_TOOLBAR_ICON_OFF_CLASS = "text-amber-200/95";

export const CALL_TOOLBAR_CAPTION_CLASS =
  "pointer-events-none w-full max-w-none text-center text-[11px] font-medium leading-snug tracking-wide text-white/55";

export const CALL_TOOLBAR_DIVIDER_CLASS =
  "hidden h-7 w-px shrink-0 self-center bg-white/20 md:block";

export const CALL_TOOLBAR_MORE_BUTTON_CLASS =
  "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/18 bg-white/15 p-0 backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 touch-manipulation active:bg-white/20";

export const CALL_STAGE_CHROME_BTN_CLASS =
  "inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

export const CALL_TILE_NAME_BADGE_CLASS =
  "max-w-[calc(100%-4rem)] truncate border-white/10 bg-black/55 text-white/90";
