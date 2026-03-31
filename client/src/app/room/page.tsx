"use client";

import { Suspense } from "react";
import { ConnectedView, useFullScreenCall } from "@/features/call";

function RoomContent() {
  const { handleEnd, handleSkip, handleMinimize } = useFullScreenCall();

  return (
    <div className="fixed inset-0 z-100 flex flex-col overflow-hidden bg-background">
      <ConnectedView onEnd={handleEnd} onSkip={handleSkip} onMinimize={handleMinimize} />
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh w-full items-center justify-center bg-background text-muted-foreground text-sm">
          Loading room…
        </div>
      }
    >
      <RoomContent />
    </Suspense>
  );
}
