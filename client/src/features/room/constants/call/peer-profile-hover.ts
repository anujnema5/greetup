import { IN_CALL_DIALOG_CONTENT_Z } from "@/features/room/constants/call/in-call-dialog-layer";
import { TILE_NAME_BADGE_CHROME } from "@/features/room/call/tiles/parts/tile-overlays";
import { cn } from "@/lib/utils";

export const PEER_PROFILE_HOVER_OPEN_DELAY_MS = 200;
export const PEER_PROFILE_HOVER_CLOSE_DELAY_MS = 120;

/** Hit target on the tile — must sit above video/backdrop layers. */
export const PEER_PROFILE_HOVER_TRIGGER_CLASS = cn(
  "pointer-events-auto absolute bottom-2 left-2 z-[60] max-w-[calc(100%-1rem)]",
  TILE_NAME_BADGE_CHROME,
  "cursor-pointer truncate text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
);

/** Portal panel — above in-call shell (`z-100`). */
export const PEER_PROFILE_HOVER_PANEL_CLASS = cn(
  IN_CALL_DIALOG_CONTENT_Z,
  "w-[min(17rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg",
);
