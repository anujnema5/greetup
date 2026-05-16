"use client";

import { useState, type ReactNode } from "react";
import { MicOff, VideoOff } from "lucide-react";
import {
  ParticipantKickMenuButton,
  ParticipantRemoveConfirmDialog,
  type ParticipantRemoveTarget,
} from "@/features/room/call/components/participant-kick-actions";
import type { OnRemoveCircleParticipant } from "@/features/room/types/call/participant-remove.types";
import { cn } from "@/lib/utils";

/** Shared shell for local + remote tile bottom-right controls. */
export const TILE_CONTROLS_BAR_CLASS =
  "pointer-events-auto absolute bottom-2.5 right-2.5 z-30 flex cursor-default items-center gap-0.5 rounded-lg border border-white/10 bg-black/60 px-1 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.35)] backdrop-blur-md";

const STATUS_CHIP = "inline-flex size-5 items-center justify-center rounded-[5px]";
const STATUS_ICON = "size-3 shrink-0";

type MediaStatusProps = {
  micOn?: boolean;
  cameraOn?: boolean;
};

export function TileMediaStatusIcons({ micOn, cameraOn }: MediaStatusProps) {
  const showMicOff = micOn === false;
  const showCameraOff = cameraOn === false;

  if (!showMicOff && !showCameraOff) return null;

  return (
    <div className="flex items-center gap-0.5" aria-label="Media status">
      {showMicOff ? (
        <span className={cn(STATUS_CHIP, "bg-amber-400/12")} title="Microphone off">
          <MicOff className={cn(STATUS_ICON, "text-amber-200/85")} strokeWidth={2.2} />
        </span>
      ) : null}
      {showCameraOff ? (
        <span className={cn(STATUS_CHIP, "bg-white/10")} title="Camera off">
          <VideoOff className={cn(STATUS_ICON, "text-white/50")} strokeWidth={2.2} />
        </span>
      ) : null}
    </div>
  );
}

type TileMediaControlsBarProps = MediaStatusProps & {
  className?: string;
  /** Host ⋮ menu or other trailing control. */
  trailing?: ReactNode;
};

/** Bottom-right media status pill — same chrome on every tile (incl. “You”). */
export function TileMediaControlsBar({
  micOn,
  cameraOn,
  className,
  trailing,
}: TileMediaControlsBarProps) {
  const showMicOff = micOn === false;
  const showCameraOff = cameraOn === false;
  const showStatus = showMicOff || showCameraOff;
  const showTrailing = Boolean(trailing);

  if (!showStatus && !showTrailing) return null;

  return (
    <div
      className={cn(TILE_CONTROLS_BAR_CLASS, className)}
      onPointerDown={trailing ? (e) => e.stopPropagation() : undefined}
    >
      {showStatus ? <TileMediaStatusIcons micOn={micOn} cameraOn={cameraOn} /> : null}
      {showStatus && showTrailing ? (
        <span className="mx-0.5 h-3.5 w-px shrink-0 bg-white/15" aria-hidden />
      ) : null}
      {trailing}
    </div>
  );
}

type ParticipantTileControlsBarProps = MediaStatusProps & {
  className?: string;
  userId: string;
  displayName: string;
  canKick: boolean;
  kickingUserId: string | null;
  onKickParticipant?: OnRemoveCircleParticipant;
};

/** Remote tile: media status + host remove/restrict menu. */
export function ParticipantTileControlsBar({
  micOn,
  cameraOn,
  className,
  userId,
  displayName,
  canKick,
  kickingUserId,
  onKickParticipant,
}: ParticipantTileControlsBarProps) {
  const [confirmTarget, setConfirmTarget] = useState<ParticipantRemoveTarget | null>(null);
  const showMenu = canKick && Boolean(onKickParticipant);
  const isRemoving = kickingUserId === userId;

  const menu = showMenu ? (
    <ParticipantKickMenuButton
      variant="tile"
      embedded
      participantLabel={displayName}
      disabled={isRemoving}
      onRequestRemove={() =>
        setConfirmTarget({ userId, displayName, restrict: false })
      }
      onRequestRestrict={() =>
        setConfirmTarget({ userId, displayName, restrict: true })
      }
    />
  ) : null;

  return (
    <>
      <TileMediaControlsBar
        micOn={micOn}
        cameraOn={cameraOn}
        className={className}
        trailing={menu}
      />
      {showMenu ? (
        <ParticipantRemoveConfirmDialog
          target={confirmTarget}
          onOpenChange={(open) => {
            if (!open) setConfirmTarget(null);
          }}
          removing={kickingUserId != null}
          onConfirm={(target) => {
            if (!onKickParticipant) return;
            setConfirmTarget(null);
            void onKickParticipant(target.userId, target.displayName, {
              restrict: target.restrict,
            });
          }}
        />
      ) : null}
    </>
  );
}
