"use client";

import { useRef } from "react";
import { Monitor, Sparkles } from "lucide-react";
import type { ScreenShareTileInfo } from "@/features/rtc/types/mediasoup-room.types";
import { useAttachMediaStream } from "@/features/room/hooks/use-attach-media-stream";
import { hasLiveVideo, mediaStreamVideoAttachRevision } from "@/features/rtc";
import { cn } from "@/lib/utils";

/** Screen-share picker: thumbs clone tracks so the main stage can use the same producer without decoder contention. */
export function SharedScreensChooser({
  tiles,
  focusedKey,
  onSelect,
  className,
}: {
  tiles: ScreenShareTileInfo[];
  focusedKey: string | null;
  onSelect: (key: string) => void;
  className?: string;
}) {
  if (tiles.length === 0) return null;

  return (
    <ul
      className={cn("flex flex-col gap-2", className)}
      role="listbox"
      aria-label="Choose which screen to show on the main stage"
    >
      {tiles.map((tile, index) => {
        const onStage = Boolean(focusedKey && tile.key === focusedKey);
        return (
          <li key={tile.key} className="min-w-0">
            <SharedScreenChooserRow
              index={index}
              tile={tile}
              onStage={onStage}
              onSelect={() => onSelect(tile.key)}
            />
          </li>
        );
      })}
    </ul>
  );
}

function SharedScreenChooserRow({
  tile,
  index,
  onStage,
  onSelect,
}: {
  tile: ScreenShareTileInfo;
  index: number;
  onStage: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const live = hasLiveVideo(tile.stream);
  useAttachMediaStream(
    ref,
    tile.stream,
    `${live ? 1 : 0}:${mediaStreamVideoAttachRevision(tile.stream)}`,
    { cloneVideoTracksForPlayback: true },
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={onStage}
      className={cn(
        "flex w-full min-w-0 gap-3 rounded-xl border bg-card/80 p-2.5 text-left shadow-sm transition-colors",
        onStage
          ? "border-primary ring-2 ring-primary/35"
          : "border-border/70 hover:border-primary/45 hover:bg-muted/40",
      )}
    >
      <div className="relative h-16 w-[7.5rem] shrink-0 overflow-hidden rounded-lg bg-black">
        {live ? (
          <video ref={ref} playsInline autoPlay className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
            …
          </div>
        )}
        <span className="absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded bg-black/75 px-1 text-[10px] font-bold text-white">
          {index + 1}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Screen share {index + 1}
        </span>
        <span className="truncate text-sm font-semibold text-foreground">{tile.label}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium",
            onStage ? "text-primary" : "text-muted-foreground",
          )}
        >
          {onStage ? (
            <>
              <Sparkles size={12} className="shrink-0" />
              On main stage
            </>
          ) : (
            <>
              <Monitor size={12} className="shrink-0" />
              Show on main stage
            </>
          )}
        </span>
      </div>
    </button>
  );
}

/** Picker for any number of screen shares (sidebar, etc.). */
export function ScreenShareTilePicker({
  tiles,
  focusedKey,
  onSelect,
  className,
  layout = "horizontal",
}: {
  tiles: ScreenShareTileInfo[];
  focusedKey: string | null;
  onSelect: (key: string) => void;
  className?: string;
  layout?: "horizontal" | "vertical";
}) {
  if (tiles.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto flex gap-1.5 rounded-lg bg-muted/40 p-1.5",
        layout === "horizontal" ? "max-w-full flex-row overflow-x-auto" : "flex-col",
        className,
      )}
      role="list"
      aria-label="Screen shares"
    >
      {tiles.map((tile) => (
        <ScreenShareStripItem
          key={tile.key}
          tile={tile}
          isFocused={tile.key === focusedKey}
          onSelect={() => onSelect(tile.key)}
          compact={layout === "vertical"}
        />
      ))}
    </div>
  );
}

export function ScreenShareFilmstrip({
  tiles,
  focusedKey,
  onSelect,
  className,
}: {
  tiles: ScreenShareTileInfo[];
  focusedKey: string | null;
  onSelect: (key: string) => void;
  className?: string;
}) {
  if (tiles.length <= 1) return null;

  return (
    <ScreenShareTilePicker
      tiles={tiles}
      focusedKey={focusedKey}
      onSelect={onSelect}
      layout="horizontal"
      className={cn(
        "max-w-full bg-black/50 backdrop-blur-sm",
        className,
      )}
    />
  );
}

function ScreenShareStripItem({
  tile,
  isFocused,
  onSelect,
  compact = false,
}: {
  tile: ScreenShareTileInfo;
  isFocused: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const live = hasLiveVideo(tile.stream);
  useAttachMediaStream(
    ref,
    tile.stream,
    `${live ? 1 : 0}:${mediaStreamVideoAttachRevision(tile.stream)}`,
    { cloneVideoTracksForPlayback: true },
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md border-2 text-left transition-colors",
        compact ? "h-20 w-full" : "h-16 w-28",
        isFocused ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50",
      )}
      aria-pressed={isFocused}
    >
      {live ? (
        <video ref={ref} playsInline autoPlay className="h-full w-full bg-black object-contain" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-[10px] text-muted-foreground">
          …
        </div>
      )}
      <span className="absolute bottom-0 left-0 right-0 truncate bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white/95">
        {tile.label}
      </span>
    </button>
  );
}
