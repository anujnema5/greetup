import { Suspense } from "react";
import { RoomPage } from "@/features/room";

export default function RoomIdPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh w-full items-center justify-center bg-background text-sm text-muted-foreground">
          Connecting to room…
        </div>
      }
    >
      <RoomPage />
    </Suspense>
  );
}
