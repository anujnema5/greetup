"use client";

import { useEffect, useRef } from "react";
import { CalendarClock, Loader2, Mic, MicOff, Radio, Sparkles, Video, VideoOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_CIRCLE_DISPLAY_TITLE } from "@/features/room/constants/call/circle-display";
import { cn } from "@/lib/utils";
import { scheduledStartTimeDisclaimerCompact } from "@/features/circles/constants/scheduled-circle-join-grace";
import { useLobbyPreviewMedia } from "@/features/room/hooks/lobby/use-lobby-preview-media";

export type CircleLobbyOverlayProps = {
  open: boolean;
  circleTitle: string | null;
  /** Formatted local start time, or null if unknown */
  scheduledLabel: string | null;
  /** `true` when waiting on scheduled start (LOBBY_NOT_READY) */
  waitingForScheduledStart: boolean;
  rtcTokenError: string | null;
  rtcTokenLoading: boolean;
  onJoinCircle: () => void;
  /** Shown in footer — who is waiting */
  viewerDisplayName: string;
  /** Host-only: circle is still `scheduled` in DB — show early go-live CTA. */
  hostCanStartScheduledNow?: boolean;
  hostStartScheduledBusy?: boolean;
  onHostStartScheduledNow?: () => void;
};

/**
 * Full-screen pre-join lobby for circles: ambient layout, camera preview, schedule, join CTA.
 */
export function CircleLobbyOverlay({
  open,
  circleTitle,
  scheduledLabel,
  waitingForScheduledStart,
  rtcTokenError,
  rtcTokenLoading,
  onJoinCircle,
  viewerDisplayName,
  hostCanStartScheduledNow = false,
  hostStartScheduledBusy = false,
  onHostStartScheduledNow,
}: CircleLobbyOverlayProps) {
  const lobbyPreview = useLobbyPreviewMedia(open);
  const lobbyPreviewVideoRef = useRef<HTMLVideoElement>(null);
  const isAcquiringPreview =
    open && !lobbyPreview.previewStream && !lobbyPreview.error;

  useEffect(() => {
    const el = lobbyPreviewVideoRef.current;
    if (!el) return;
    el.srcObject = lobbyPreview.previewStream;
    void el.play().catch(() => {});
  }, [lobbyPreview.previewStream]);

  if (!open) return null;

  const headline = circleTitle?.trim() || DEFAULT_CIRCLE_DISPLAY_TITLE;

  return (
    <div
      className="absolute inset-0 z-[200] flex flex-col overflow-y-auto overflow-x-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="circle-lobby-title"
    >
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 bg-background/95 backdrop-blur-[8px]" />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-40 size-[22rem] rounded-full bg-primary/[0.11] blur-3xl" />
        <div className="absolute -right-20 top-1/4 size-[20rem] rounded-full bg-accent/35 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/4 size-[26rem] rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,var(--background)_68%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <Badge variant="outline" className="gap-1 border-primary/25 bg-primary/5 px-3 py-1 text-[11px] font-semibold tracking-wide text-primary uppercase">
            <Sparkles className="size-3" aria-hidden />
            Lobby
          </Badge>
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground/90">{viewerDisplayName}</span>
          </p>
        </div>

        {/* Preview stage */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border/60 bg-linear-to-b from-muted/40 to-muted/10 shadow-[0_28px_90px_-24px_rgba(15,18,28,0.45)] ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
            "aspect-video w-full",
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/70 via-black/25 to-transparent" />
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full border border-white/12 bg-black/45 px-2 py-1.5 shadow-lg backdrop-blur-md">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-10 rounded-full text-white hover:bg-white/15 hover:text-white"
                  aria-label={lobbyPreview.micOn ? "Mute microphone" : "Unmute microphone"}
                  onClick={() => lobbyPreview.toggleMic()}
                >
                  {lobbyPreview.micOn ? (
                    <Mic className="size-[1.15rem]" aria-hidden />
                  ) : (
                    <MicOff className="size-[1.15rem] text-amber-300" aria-hidden />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-10 rounded-full text-white hover:bg-white/15 hover:text-white"
                  aria-label={lobbyPreview.camOn ? "Turn off camera" : "Turn on camera"}
                  onClick={() => lobbyPreview.toggleCamera()}
                >
                  {lobbyPreview.camOn ? (
                    <Video className="size-[1.15rem]" aria-hidden />
                  ) : (
                    <VideoOff className="size-[1.15rem] text-amber-300" aria-hidden />
                  )}
                </Button>
              </div>
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/40 px-2 py-1 text-[10px] font-medium tracking-wide text-white/80 uppercase backdrop-blur-sm">
                Preview
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 bg-muted/25 px-6 text-center">
              {isAcquiringPreview ? (
                <>
                  <div className="flex size-16 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-inner">
                    <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Getting your camera ready</p>
                    <p className="text-xs text-muted-foreground">Allow access when your browser asks</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {lobbyPreview.error ?? "Could not start preview"}
                  </div>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    You can still try to join this circle — we&apos;ll connect audio and video once the
                    room opens.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <Card className="border-border/70 bg-card/90 py-0 shadow-[0_20px_50px_-28px_rgba(15,18,28,0.35)] backdrop-blur-sm">
          <CardHeader className="gap-3 border-b border-border/50 pb-5 pt-6 sm:pt-7">
            <CardTitle
              id="circle-lobby-title"
              className="text-balance text-xl font-semibold tracking-tight sm:text-2xl"
            >
              {headline}
            </CardTitle>
            {scheduledLabel ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 sm:px-3.5 sm:py-3">
                <CalendarClock
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Scheduled start
                  </p>
                  <p className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                    {scheduledLabel}
                  </p>
                  {/* <p className="mt-2 border-t border-border/50 pt-2 text-[11px] leading-snug text-muted-foreground">
                    {scheduledStartTimeDisclaimerCompact()}
                  </p> */}
                </div>
              </div>
            ) : null}
            <CardDescription className="text-pretty text-sm leading-relaxed sm:text-[15px]">
              {hostCanStartScheduledNow && waitingForScheduledStart
                ? "As the host, you can go live whenever you’re ready. Guests can join once the circle is open (or after the scheduled time if you wait)."
                : waitingForScheduledStart
                  ? rtcTokenError ??
                    "The host hasn’t opened this circle yet, or it’s still before the scheduled time. Check your mic and camera here, then join when you’re ready."
                  : "The host hasn’t opened this circle for everyone yet. You can test your devices here—we’ll connect you when the room opens."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-7 pt-5">
            {hostCanStartScheduledNow && onHostStartScheduledNow ? (
              <Button
                type="button"
                size="lg"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold shadow-md transition-transform active:scale-[0.99]"
                disabled={hostStartScheduledBusy || rtcTokenLoading}
                onClick={() => onHostStartScheduledNow()}
              >
                {hostStartScheduledBusy ? (
                  <>
                    <Loader2 className="size-5 animate-spin" aria-hidden />
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
              variant={hostCanStartScheduledNow ? "outline" : "default"}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold shadow-md transition-transform active:scale-[0.99]"
              disabled={rtcTokenLoading || hostStartScheduledBusy}
              onClick={() => void onJoinCircle()}
            >
              {rtcTokenLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  Connecting…
                </>
              ) : hostCanStartScheduledNow ? (
                "Try connecting"
              ) : (
                "Join circle"
              )}
            </Button>
            <p className="flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground">
              <Radio className="size-3.5 shrink-0 opacity-70" aria-hidden />
              <span>We also check in the background about every 10 seconds.</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
