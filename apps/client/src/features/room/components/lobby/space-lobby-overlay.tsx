"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Loader2,
  Mic,
  MicOff,
  Radio,
  Video,
  VideoOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeaderToolbar } from "@/features/app-shell/components/page-header/page-header-toolbar";
import { timeGreeting } from "@/features/dashboard/lib/time-greeting";
import { DEFAULT_SPACE_DISPLAY_TITLE } from "@/features/room/constants/call/space-display";
import { cn } from "@/lib/utils";
import type { LobbyPreviewMedia } from "@/features/room/hooks/lobby/use-lobby-preview-media";

export type SpaceLobbyOverlayProps = {
  open: boolean;
  lobbyPreview: LobbyPreviewMedia;
  spaceTitle: string | null;
  scheduledLabel: string | null;
  waitingForScheduledStart: boolean;
  rtcTokenError: string | null;
  rtcTokenLoading: boolean;
  onJoinSpace: () => void;
  viewerDisplayName: string;
  hostCanStartScheduledNow?: boolean;
  hostStartScheduledBusy?: boolean;
  onHostStartScheduledNow?: () => void;
  onLeave?: () => void;
};

function lobbyFirstName(displayName: string): string {
  return displayName.split(/\s+/).filter(Boolean)[0] ?? displayName;
}

function DeviceToggleButton({
  active,
  acquiring,
  disabled,
  onClick,
  onLabel,
  offLabel,
  children,
}: {
  active: boolean;
  acquiring: boolean;
  disabled?: boolean;
  onClick: () => void;
  onLabel: string;
  offLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled || acquiring}
      onClick={onClick}
      aria-label={active ? onLabel : offLabel}
      className={cn(
        "flex size-12 cursor-pointer items-center justify-center rounded-xl border transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-primary/30 bg-primary/12 text-primary"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {acquiring ? <Loader2 className="size-5 animate-spin" aria-hidden /> : children}
    </button>
  );
}

function DeviceMediaControls({ lobbyPreview }: { lobbyPreview: LobbyPreviewMedia }) {
  return (
    <div className="flex gap-2.5">
      <DeviceToggleButton
        active={lobbyPreview.micOn}
        acquiring={lobbyPreview.acquiring === "mic"}
        disabled={lobbyPreview.acquiring === "cam"}
        onClick={() => void lobbyPreview.toggleMic()}
        onLabel="Mute microphone"
        offLabel="Turn on microphone"
      >
        {lobbyPreview.micOn ? (
          <Mic className="size-5" aria-hidden />
        ) : (
          <MicOff className="size-5 text-amber-500 dark:text-amber-300" aria-hidden />
        )}
      </DeviceToggleButton>
      <DeviceToggleButton
        active={lobbyPreview.camOn}
        acquiring={lobbyPreview.acquiring === "cam"}
        disabled={lobbyPreview.acquiring === "mic"}
        onClick={() => void lobbyPreview.toggleCamera()}
        onLabel="Turn off camera"
        offLabel="Turn on camera"
      >
        {lobbyPreview.camOn ? (
          <Video className="size-5" aria-hidden />
        ) : (
          <VideoOff className="size-5 text-amber-500 dark:text-amber-300" aria-hidden />
        )}
      </DeviceToggleButton>
    </div>
  );
}

function LobbySectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function LobbyCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-hero-card-surface shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SpaceLobbyOverlay({
  open,
  lobbyPreview,
  spaceTitle,
  scheduledLabel,
  waitingForScheduledStart,
  rtcTokenError,
  rtcTokenLoading,
  onJoinSpace,
  viewerDisplayName,
  hostCanStartScheduledNow = false,
  hostStartScheduledBusy = false,
  onHostStartScheduledNow,
  onLeave,
}: SpaceLobbyOverlayProps) {
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

  const headline = spaceTitle?.trim() || DEFAULT_SPACE_DISPLAY_TITLE;
  const firstName = lobbyFirstName(viewerDisplayName);
  const greeting = timeGreeting();

  const sessionDescription =
    hostCanStartScheduledNow && waitingForScheduledStart
      ? "As the host, you can go live whenever you're ready. Guests can join once the space is open, or after the scheduled time if you wait."
      : waitingForScheduledStart
        ? rtcTokenError ??
          "The host hasn't opened this space yet, or it's still before the scheduled time. Test your devices here, then join when you're ready."
        : "The host hasn't opened this space for everyone yet. Test your devices here and we'll connect you when the room opens.";

  return (
    <div
      className="absolute inset-0 z-[200] flex flex-col overflow-hidden bg-background"
      role="dialog"
      aria-modal="true"
      aria-labelledby="space-lobby-title"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 size-[24rem] rounded-full bg-primary/[0.06] blur-3xl" />
        <div className="absolute -right-24 top-1/3 size-[20rem] rounded-full bg-secondary/[0.08] blur-3xl" />
      </div>

      <header className="relative z-40 shrink-0 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {onLeave ? (
              <button
                type="button"
                onClick={onLeave}
                aria-label="Leave lobby"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft size={18} aria-hidden />
              </button>
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold leading-none text-foreground sm:text-base">
                {greeting}, {firstName}
              </h1>
              <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">
                Space lobby
              </p>
            </div>
          </div>
          <PageHeaderToolbar />
        </div>
      </header>

      <div className="app-scrollbar relative min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:py-6 lg:gap-7 lg:px-6 lg:py-8">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="gap-1.5 rounded-full border-primary/25 bg-primary/8 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase"
              >
                <Radio className="size-3" aria-hidden />
                {hostCanStartScheduledNow ? "Host" : "Waiting"}
              </Badge>
              {scheduledLabel ? (
                <span className="text-xs text-muted-foreground">Scheduled space</span>
              ) : null}
            </div>
            <h2
              id="space-lobby-title"
              className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-[1.65rem]"
            >
              {headline}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {sessionDescription}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6 lg:items-stretch">
            <section className="flex min-h-0 flex-col gap-2.5">
              <LobbySectionLabel>Device check</LobbySectionLabel>
              <LobbyCard className="flex min-h-[300px] flex-1 flex-col sm:min-h-[340px] lg:min-h-[min(440px,52vh)]">
                <div
                  className={cn(
                    "relative min-h-[220px] flex-1",
                    lobbyPreview.previewStream && "bg-black/20",
                  )}
                >
                  {lobbyPreview.previewStream ? (
                    <>
                      <video
                        ref={lobbyPreviewVideoRef}
                        className="absolute inset-0 h-full w-full object-cover"
                        playsInline
                        autoPlay
                        muted
                      />
                      <div className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/85 uppercase backdrop-blur-sm">
                        Preview
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
                      {isAcquiringPreview ? (
                        <>
                          <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted/40">
                            <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">
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
                          <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted/35">
                            <VideoOff className="size-7 text-muted-foreground/75" aria-hidden />
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-sm font-semibold text-foreground">
                              Camera and mic are off
                            </p>
                            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                              Turn them on below to test before you join.
                            </p>
                            <p className="text-[11px] font-medium text-muted-foreground/80">
                              Optional
                            </p>
                          </div>
                          {lobbyPreview.error ? (
                            <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
                              {lobbyPreview.error}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {!isAcquiringPreview ? (
                  <div className="flex shrink-0 justify-center border-t border-border/50 bg-muted/15 px-4 py-4">
                    <DeviceMediaControls lobbyPreview={lobbyPreview} />
                  </div>
                ) : null}
              </LobbyCard>
            </section>

            <section className="flex min-h-0 flex-col gap-2.5">
              <LobbySectionLabel>Ready to join</LobbySectionLabel>
              <LobbyCard className="flex h-full min-h-[300px] flex-col lg:min-h-[min(440px,52vh)]">
                <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
                  {scheduledLabel ? (
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/25 p-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CalendarClock className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                          Scheduled start
                        </p>
                        <p className="mt-0.5 text-base font-semibold leading-snug text-foreground sm:text-lg">
                          {scheduledLabel}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-3.5">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {hostCanStartScheduledNow
                        ? "Open the space when you're ready, or try connecting to verify everything works on your end."
                        : "We'll connect you automatically once the host opens the room. You can also tap join to check again."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                        lobbyPreview.micOn
                          ? "border-primary/25 bg-primary/8 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground",
                      )}
                    >
                      {lobbyPreview.micOn ? (
                        <Mic className="size-3" aria-hidden />
                      ) : (
                        <MicOff className="size-3" aria-hidden />
                      )}
                      Mic {lobbyPreview.micOn ? "on" : "off"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                        lobbyPreview.camOn
                          ? "border-primary/25 bg-primary/8 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground",
                      )}
                    >
                      {lobbyPreview.camOn ? (
                        <Video className="size-3" aria-hidden />
                      ) : (
                        <VideoOff className="size-3" aria-hidden />
                      )}
                      Camera {lobbyPreview.camOn ? "on" : "off"}
                    </span>
                  </div>
                </div>

                <div className="mt-auto space-y-3 border-t border-border/60 bg-muted/10 px-5 py-4 sm:px-6 sm:py-5">
                  {hostCanStartScheduledNow && onHostStartScheduledNow ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-xl text-sm font-semibold"
                      disabled={hostStartScheduledBusy || rtcTokenLoading}
                      onClick={() => onHostStartScheduledNow()}
                    >
                      {hostStartScheduledBusy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Starting…
                        </>
                      ) : (
                        "Start space now"
                      )}
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    className="h-11 w-full rounded-xl text-sm font-semibold shadow-sm"
                    disabled={rtcTokenLoading || hostStartScheduledBusy}
                    onClick={() => void onJoinSpace()}
                  >
                    {rtcTokenLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Connecting…
                      </>
                    ) : hostCanStartScheduledNow ? (
                      "Try connecting"
                    ) : (
                      "Join space"
                    )}
                  </Button>

                  <p className="flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground">
                    <Clock className="size-3.5 shrink-0 opacity-70" aria-hidden />
                    <span>We check every 10 seconds for an open room.</span>
                  </p>
                </div>
              </LobbyCard>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
