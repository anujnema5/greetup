"use client";

import { cn } from "@/lib/utils";

type RoomMobileChatSheetDragHandleProps = {
  isDragging?: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
};

/** Grab handle for resizing the in-call mobile bottom sheet (chat / people / activities). */
export function RoomMobileChatSheetDragHandle({
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: RoomMobileChatSheetDragHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Drag up or down to resize the panel"
      className={cn(
        "flex shrink-0 touch-none select-none items-center justify-center py-2",
        "cursor-grab active:cursor-grabbing",
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div
        className={cn(
          "h-1.5 w-11 rounded-full bg-muted-foreground/45 transition-[background-color,transform]",
          isDragging && "scale-[1.03] bg-muted-foreground/65",
        )}
        aria-hidden
      />
    </div>
  );
}
