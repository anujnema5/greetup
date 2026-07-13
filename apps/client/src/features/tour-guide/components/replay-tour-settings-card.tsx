"use client";

import { useState } from "react";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TOUR_GUIDE } from "@/lib/copy/tour-guide-messages";

import { useTourGuide } from "../context/tour-guide-provider";

export function ReplayTourSettingsCard() {
  const { replayTour, isTourActive } = useTourGuide();
  const [isPending, setIsPending] = useState(false);

  const handleReplay = () => {
    setIsPending(true);
    replayTour("welcome");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-tertiary-foreground">
          <Compass className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {TOUR_GUIDE.settings.replayTitle}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {TOUR_GUIDE.settings.replayDescription}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={isTourActive || isPending}
            onClick={handleReplay}
          >
            {isPending ? TOUR_GUIDE.settings.replayPending : TOUR_GUIDE.settings.replayButton}
          </Button>
        </div>
      </div>
    </div>
  );
}
