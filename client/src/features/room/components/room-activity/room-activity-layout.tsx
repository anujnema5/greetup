"use client";

import { useEffect, useRef, type ReactNode } from "react";

type RoomActivityLayoutProps = {
  title?: string;
  subtitle?: string;
  peerLabel: string;
  myName: string;
  peerInitials: string;
  remoteVideoLive: boolean;
  localVideoLive: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  sidePanel: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

function StreamVideo({
  stream,
  muted = false,
  mirrored = false,
  className = "",
}: {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      playsInline
      autoPlay
      muted={muted}
      className={className}
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
    />
  );
}

export function RoomActivityLayout({
  title,
  subtitle,
  peerLabel,
  myName,
  peerInitials,
  remoteVideoLive,
  localVideoLive,
  remoteStream,
  localStream,
  sidePanel,
  actions,
  footer,
  children,
}: RoomActivityLayoutProps) {
  return (
    <div className="absolute inset-0 grid grid-cols-1 gap-3 bg-linear-to-br from-background/92 via-background/95 to-card/85 p-3 md:grid-cols-[13rem_minmax(0,1fr)] md:p-4">
      <div className="flex min-h-0 h-full flex-col gap-3">
        <div className="rounded-xl border border-border/70 bg-card/75 p-2">
          <p className="truncate text-sm font-semibold text-foreground">Private Room</p>
          <p className="text-xs text-muted-foreground">Connected</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-xl border border-border/70 bg-card/70 p-2">
          <div className="relative min-h-0 flex-[0.95] overflow-hidden rounded-lg border border-border/60 bg-black/55">
            {remoteVideoLive ? (
              <StreamVideo stream={remoteStream} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xl font-semibold text-white/90">
                {peerInitials}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2 py-1">
              <p className="text-xs font-medium text-white/90">{peerLabel}</p>
            </div>
          </div>

          <div className="relative min-h-0 flex-[0.7] overflow-hidden rounded-lg border border-border/60 bg-black/55">
            {localVideoLive ? (
              <StreamVideo stream={localStream} muted mirrored className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xl font-semibold text-white/90">
                {myName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2 py-1">
              <p className="text-xs font-medium text-white/90">You</p>
            </div>
          </div>

          <div className="mt-auto">{sidePanel}</div>
        </div>
      </div>

      <div className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-card/65 p-3">
        {title || subtitle ? (
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              {title ? <p className="truncate text-sm font-semibold text-foreground">{title}</p> : null}
              {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

        {actions ? <div className="mt-3 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}

        {footer ? (
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
