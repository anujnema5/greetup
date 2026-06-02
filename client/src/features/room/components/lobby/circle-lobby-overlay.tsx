"use client";

import { useEffect, useRef } from "react";
import {
  CalendarClock,
  Clock,
  Loader2,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/app-shell";
import { DEFAULT_CIRCLE_DISPLAY_TITLE } from "@/features/room/constants/call/circle-display";
import { cn } from "@/lib/utils";
import type { LobbyPreviewMedia } from "@/features/room/hooks/lobby/use-lobby-preview-media";

export type CircleLobbyOverlayProps = {
  open: boolean;
  lobbyPreview: LobbyPreviewMedia;
  circleTitle: string | null;
  /** Formatted local start time, or null if unknown */
  scheduledLabel: string | null;
  /** `true` when waiting on scheduled start (LOBBY_NOT_READY) */
  waitingForScheduledStart: boolean;
  rtcTokenError: string | null;
  rtcTokenLoading: boolean;
  onJoinCircle: () => void;
  onBack: () => void;
  /** Shown in header subtitle */
  viewerDisplayName: string;
  /** Host-only: circle is still `scheduled` in DB — show early go-live CTA. */
  hostCanStartScheduledNow?: boolean;
  hostStartScheduledBusy?: boolean;
  onHostStartScheduledNow?: () => void;
};

function PreviewControlBar({
  lobbyPreview,
  variant = "overlay",
}: {
  lobbyPreview: LobbyPreviewMedia;
  variant?: "overlay" | "inline";
}) {
  const shellClass =
    variant === "overlay"
      ? "border-white/15 bg-black/50 text-white backdrop-blur-md"
      : "border-border bg-background/95 shadow-sm";

  const offClass =
    variant === "overlay" ? "text-white/55" : "text-muted-foreground";

  return (
    <div
      className={cn(
        "flex gap-1 rounded-full border px-1.5 py-1",
        shellClass,
      )}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(
          "size-9 rounded-full",
          variant === "overlay"
            ? "text-white hover:bg-white/12 hover:text-white"
            : "hover:bg-muted",
        )}
        aria-label={lobbyPreview.micOn ? "Mute microphone" : "Turn on microphone"}
        disabled={lobbyPreview.acquiring === "mic"}
        onClick={() => void lobbyPreview.toggleMic()}
      >
        {lobbyPreview.acquiring === "mic" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : lobbyPreview.micOn ? (
          <Mic className="size-4" aria-hidden />
        ) : (
          <MicOff className={cn("size-4", offClass)} aria-hidden />
        )}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(
          "size-9 rounded-full",
          variant === "overlay"
            ? "text-white hover:bg-white/12 hover:text-white"
            : "hover:bg-muted",
        )}
        aria-label={lobbyPreview.camOn ? "Turn off camera" : "Turn on camera"}
        disabled={lobbyPreview.acquiring === "cam"}
        onClick={() => void lobbyPreview.toggleCamera()}
      >
        {lobbyPreview.acquiring === "cam" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : lobbyPreview.camOn ? (
          <Video className="size-4" aria-hidden />
        ) : (
          <VideoOff className={cn("size-4", offClass)} aria-hidden />
        )}
      </Button>
    </div>
  );
}

/**
 * Full-screen pre-join lobby for circles: camera preview, schedule, join CTA.
 */
export function CircleLobbyOverlay({
  open,
  lobbyPreview,
  circleTitle,
  scheduledLabel,
  waitingForScheduledStart,
  rtcTokenError,
  rtcTokenLoading,
  onJoinCircle,
  onBack,
  viewerDisplayName,
  hostCanStartScheduledNow = false,
  hostStartScheduledBusy = false,
  onHostStartScheduledNow,
}: CircleLobbyOverlayProps) {
  const lobbyPreviewVideoRef = useRef<HTMLVideoElement>(null);
  const isAcquiringPreview =
    open && (lobbyPreview.acquiring === "cam" || lobbyPreview.acquiring === "mic");

  useEffect(() => {
    const el = lobbyPreviewVideoRef.current;
    if (!el) return;
    el.srcObject = lobbyPreview.previewStream;
    void el.play().catch(() => {});
  }, [lobbyPreview.previewStream]);

  if (!open) return null;

  const headline = circleTitle?.trim() || DEFAULT_CIRCLE_DISPLAY_TITLE;
  const lobbyDescription =
    hostCanStartScheduledNow && waitingForScheduledStart
      ? "As the host, you can go live whenever you’re ready. Guests can join once the circle is open (or after the scheduled time if you wait)."
      : waitingForScheduledStart
        ? rtcTokenError ??
          "The host hasn’t opened this circle yet, or it’s still before the scheduled time. You can optionally test your mic and camera here, then join when you’re ready."
        : "The host hasn’t opened this circle for everyone yet. Optionally test your devices here—we’ll connect you when the room opens.";

  return (
    <div
      className="absolute inset-0 z-[200] flex flex-col overflow-hidden bg-background"
      role="dialog"
      aria-modal="true"
      aria-labelledby="circle-lobby-title"
    >
      <PageHeader
        title={<span id="circle-lobby-title">{headline}</span>}
        subtitle={`Signed in as ${viewerDisplayName}`}
        onBack={onBack}
        backLabel="Leave circle lobby"
        className="relative z-10 shrink-0 shadow-none"
      />

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="grid w-full max-w-4xl grid-cols-1 items-start gap-6 md:grid-cols-2 md:items-stretch md:gap-8 lg:max-w-5xl lg:gap-10">
          {/* Left — device preview */}
          <div className="flex w-full flex-col gap-2.5 md:h-full">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Device check
            </p>
            <div
              className={cn(
                "relative mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-border/80 bg-muted/30 shadow-sm",
                "aspect-[16/10] md:mx-0 md:max-w-none md:min-h-[280px] md:flex-1",
              )}
            >
              {lobbyPreview.previewStream ? (
                <>
                  <video
                    ref={lobbyPreviewVideoRef}
                    className="h-full w-full object-cover"
                    playsInline
                    autoPlay
                    muted
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
                    <PreviewControlBar lobbyPreview={lobbyPreview} variant="overlay" />
                  </div>
                </>
              ) : (
                <div className="relative flex h-full min-h-[200px] flex-col items-center justify-center gap-2.5 px-5 py-8 text-center sm:min-h-0">
                  {isAcquiringPreview ? (
                    <>
                      <div className="flex size-11 items-center justify-center rounded-full border border-border/80 bg-background/80">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {lobbyPreview.acquiring === "cam"
                            ? "Turning on camera"
                            : "Turning on microphone"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Allow access when your browser asks
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex size-11 items-center justify-center rounded-full border border-border/80 bg-background/80">
                        <VideoOff className="size-5 text-muted-foreground" aria-hidden />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          Camera and mic are off
                        </p>
                        <p className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                          Turn them on below to test before you join. Optional.
                        </p>
                      </div>
                      {lobbyPreview.error ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                          {lobbyPreview.error}
                        </div>
                      ) : null}
                    </>
                  )}
                  {!isAcquiringPreview ? (
                    <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
                      <PreviewControlBar lobbyPreview={lobbyPreview} variant="inline" />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Right — circle details & actions */}
          <div className="flex w-full flex-col gap-5 rounded-2xl border border-border/70 bg-card/40 p-5 sm:p-6 md:min-h-[280px] md:justify-between md:gap-5 lg:p-7">
            <div className="space-y-3.5">
              {scheduledLabel ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5">
                  <CalendarClock
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Scheduled start
                    </p>
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {scheduledLabel}
                    </p>
                  </div>
                </div>
              ) : null}

              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                {lobbyDescription}
              </p>
            </div>

            <div className="mt-auto space-y-2.5 border-t border-border/50 pt-4">
              {hostCanStartScheduledNow && onHostStartScheduledNow ? (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="h-10 w-full rounded-lg text-sm font-medium"
                  disabled={hostStartScheduledBusy || rtcTokenLoading}
                  onClick={() => onHostStartScheduledNow()}
                >
                  {hostStartScheduledBusy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Starting…
                    </>
                  ) : (
                    "Start circle now"
                  )}
                </Button>
              ) : null}
              <Button
                type="button"
                size="lg"
                className="h-10 w-full rounded-lg text-sm font-semibold"
                disabled={rtcTokenLoading || hostStartScheduledBusy}
                onClick={() => void onJoinCircle()}
              >
                {rtcTokenLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Connecting…
                  </>
                ) : hostCanStartScheduledNow ? (
                  "Try connecting"
                ) : (
                  "Join circle"
                )}
              </Button>
              <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] text-muted-foreground">
                <Clock className="size-3.5 shrink-0 opacity-70" aria-hidden />
                <span>We check every 10 seconds for an open room.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
