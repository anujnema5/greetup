/** Shared participant-tile styling (matches direct 1:1 in-call tiles). */

export const CALL_TILE_REMOTE_CLASS =
  "relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-black";

export const CALL_TILE_LOCAL_CLASS =
  "relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm";

export const CALL_TILE_CAMERA_OFF_CLASS =
  "pointer-events-none absolute inset-0 flex items-center justify-center border border-border/60 bg-linear-to-br from-primary/15 via-muted/45 to-accent/20";

/** Camera-off / avatar backdrop on direct-call stage tiles (must not block name hover). */
export const CALL_TILE_MEDIA_BACKDROP_CLASS = CALL_TILE_CAMERA_OFF_CLASS;

export const CALL_TILE_AVATAR_SIZE_MAIN = "h-20 w-20 md:h-24 md:w-24";

export const CALL_TILE_AVATAR_SIZE_COMPACT = "h-14 w-14 md:h-16 md:w-16";

export const CALL_TILE_REMOTE_NAME_BADGE_CLASS =
  "max-w-[calc(100%-4rem)] truncate border-white/10 bg-black/55 text-white/90";
