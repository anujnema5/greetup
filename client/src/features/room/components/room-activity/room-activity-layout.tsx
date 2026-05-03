"use client";

import { useEffect, useRef, type ReactNode } from "react";

type RoomActivityVideoTilesProps = {
  peerLabel: string;
  myName: string;
  peerInitials: string;
  remoteVideoLive: boolean;
  localVideoLive: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  /** On narrow screens, remote + local in one row (shared width). */
  narrowVideosSideBySide?: boolean;
  /** Stretch tiles to fill parent height on narrow (chess: video row flex-1). */
  fillAvailableOnNarrow?: boolean;
  /** On narrow side-by-side row, give the remote peer tile more width. */
  narrowEmphasizePeer?: boolean;
  /** On narrow side-by-side row, give the local (“You”) tile more width. */
  narrowEmphasizeLocal?: boolean;
  className?: string;
};

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
  /** On narrow screens, place remote + local tiles in one row (e.g. chess). */
  narrowVideosSideBySide?: boolean;
  /**
   * When true, video tiles are not shown in the left/bottom rail below `md` — render
   * `RoomActivityVideoTiles` inside activity content instead (e.g. directly under the chessboard).
   */
  omitNarrowRailVideos?: boolean;
  /**
   * On phones when `omitNarrowRailVideos`, rendered below the main stage in a scrollable strip
   * (e.g. chess match / moves / actions) together with room + score.
   */
  narrowScrollFooter?: ReactNode;
  sidePanel: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function RoomActivityStreamVideo({
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

export function RoomActivityVideoTiles({
  peerLabel,
  myName,
  peerInitials,
  remoteVideoLive,
  localVideoLive,
  remoteStream,
  localStream,
  narrowVideosSideBySide = false,
  fillAvailableOnNarrow = false,
  narrowEmphasizePeer = false,
  narrowEmphasizeLocal = false,
  className = "",
}: RoomActivityVideoTilesProps) {
  const narrowRowFill = narrowVideosSideBySide && fillAvailableOnNarrow;
  const peerWide = narrowVideosSideBySide && narrowEmphasizePeer;
  const localWide = narrowVideosSideBySide && narrowEmphasizeLocal && !narrowEmphasizePeer;
  const narrowWeighted = peerWide || localWide;
  /** Width-based split avoids flex “sliver” bugs; peer-wide ≈ 56/44 so local stays usable. */
  const narrowPeerTileFlex = peerWide
    ? "max-md:w-[56%] max-md:max-w-[62%] max-md:min-w-[48%] max-md:flex-none max-md:shrink-0"
    : localWide
      ? "max-md:flex-[0.72] max-md:basis-0 max-md:min-w-[30%]"
      : "";
  const narrowLocalTileFlex = peerWide
    ? "max-md:min-w-[34%] max-md:flex-1 max-md:basis-0"
    : localWide
      ? "max-md:flex-[1.28] max-md:basis-0"
      : "";
  return (
    <div
      className={[
        "flex flex-col gap-2 md:min-h-0 md:flex-1 md:gap-2",
        narrowVideosSideBySide ? "max-md:flex-row max-md:items-stretch" : "max-md:gap-2.5",
        narrowRowFill ? "max-md:h-full max-md:min-h-0" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-lg border border-border/60 bg-black/55",
          "w-full md:aspect-auto md:min-h-0",
          narrowRowFill
            ? peerWide
              ? "max-md:min-h-0 min-h-[10.5rem]"
              : narrowWeighted
                ? "max-md:min-h-0 max-md:min-w-0 min-h-[10.5rem]"
                : "max-md:min-h-0 max-md:flex-1 max-md:basis-0 max-md:min-w-0 min-h-[10.5rem]"
            : narrowVideosSideBySide
              ? narrowWeighted
                ? peerWide
                  ? "min-h-[10.5rem] max-md:min-h-0 max-md:basis-0"
                  : "min-h-[10.5rem] max-md:min-h-0 max-md:basis-0 max-md:min-w-0"
                : "min-h-[10.5rem] max-md:h-32 max-md:min-h-32 max-md:max-h-32 max-md:flex-1 max-md:basis-0 max-md:min-w-0"
              : "min-h-[10.5rem] max-md:min-h-[10rem]",
          narrowPeerTileFlex,
          "md:flex-[0.95]",
        ].join(" ")}
      >
        {remoteVideoLive ? (
          <RoomActivityStreamVideo
            stream={remoteStream}
            className={[
              "h-full w-full object-cover md:min-h-0",
              narrowRowFill || narrowVideosSideBySide
                ? "max-md:min-h-0"
                : "min-h-[10rem] max-md:min-h-[10rem]",
            ].join(" ")}
          />
        ) : (
          <div
            className={[
              "flex h-full items-center justify-center text-lg font-semibold text-white/90 sm:text-xl md:min-h-0",
              narrowRowFill || narrowVideosSideBySide
                ? "max-md:min-h-0 min-h-[10rem]"
                : "min-h-[10rem] max-md:min-h-[10rem]",
            ].join(" ")}
          >
            {peerInitials}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2 py-1">
          <p className="truncate text-[11px] font-medium text-white/90 sm:text-xs">{peerLabel}</p>
        </div>
      </div>

      <div
        className={[
          "relative overflow-hidden rounded-lg border border-border/60 bg-black/55",
          "w-full md:aspect-auto md:min-h-0 md:flex-[0.7]",
          narrowRowFill
            ? peerWide
              ? "max-md:min-h-0 min-h-[9.5rem]"
              : narrowWeighted
                ? "max-md:min-h-0 max-md:min-w-0 min-h-[9.5rem]"
                : "max-md:min-h-0 max-md:flex-1 max-md:basis-0 max-md:min-w-0 min-h-[9.5rem]"
            : narrowVideosSideBySide
              ? narrowWeighted
                ? peerWide
                  ? "min-h-[9.5rem] max-md:min-h-0 max-md:basis-0"
                  : "min-h-[9.5rem] max-md:min-h-0 max-md:basis-0 max-md:min-w-0"
                : "min-h-[9.5rem] max-md:h-32 max-md:min-h-32 max-md:max-h-32 max-md:flex-1 max-md:basis-0 max-md:min-w-0"
              : "min-h-[9.5rem] max-md:min-h-[9.5rem]",
          narrowLocalTileFlex,
        ].join(" ")}
      >
        {localVideoLive ? (
          <RoomActivityStreamVideo
            stream={localStream}
            muted
            mirrored
            className={[
              "h-full w-full object-cover md:min-h-0",
              narrowRowFill || narrowVideosSideBySide
                ? "max-md:min-h-0"
                : "min-h-[9.5rem] max-md:min-h-[9.5rem]",
            ].join(" ")}
          />
        ) : (
          <div
            className={[
              "flex h-full items-center justify-center text-lg font-semibold text-white/90 sm:text-xl md:min-h-0",
              narrowRowFill || narrowVideosSideBySide
                ? "max-md:min-h-0 min-h-[9.5rem]"
                : "min-h-[9.5rem] max-md:min-h-[9.5rem]",
            ].join(" ")}
          >
            {myName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2 py-1">
          <p className="text-[11px] font-medium text-white/90 sm:text-xs">You</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Grid on md+: video/score rail + main stage. Chess on phones omits the rail and uses `narrowScrollFooter`.
 */
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
  narrowVideosSideBySide = false,
  omitNarrowRailVideos = false,
  narrowScrollFooter = null,
  sidePanel,
  actions,
  footer,
  children,
}: RoomActivityLayoutProps) {
  /** Chess phones: document flow + bottom meta card; stage scroll is the parent `RoomVideoStage`. */
  const chessMobileDocumentFlow = omitNarrowRailVideos && Boolean(narrowScrollFooter);

  return (
    <div
      className={[
        "min-h-0 bg-linear-to-br from-background/92 via-background/95 to-card/85",
        "flex flex-col gap-3 overflow-x-hidden p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3 sm:p-4",
        chessMobileDocumentFlow
          ? "relative h-auto min-h-full w-full max-md:overflow-x-hidden max-md:overflow-y-visible max-md:gap-1.5 max-md:px-1.5 max-md:pt-1.5 max-md:pb-3 md:absolute md:inset-0 md:min-h-0 md:overflow-hidden"
          : "absolute inset-0 min-h-0 overflow-y-auto",
        "md:grid md:grid-cols-[minmax(9.25rem,11.5rem)_minmax(0,1fr)] md:grid-rows-1 md:gap-3 md:overflow-hidden md:p-3 md:pb-3",
        "lg:grid-cols-[minmax(10.5rem,13rem)_minmax(0,1fr)] lg:gap-4 lg:p-4",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Videos + score: below board on phones; left rail on md+ */}
      <div
        className={[
          "order-2 flex w-full shrink-0 flex-col gap-2 sm:gap-3 md:order-1 md:h-full md:min-h-0 md:max-w-none",
          omitNarrowRailVideos ? "max-md:hidden" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={[
            "rounded-xl border border-border/70 bg-card/75 p-2 sm:p-2.5 md:p-2.5",
            omitNarrowRailVideos ? "max-md:p-1.5 max-md:py-1" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p className="truncate text-xs font-semibold text-foreground md:text-sm">
            Private Room
            <span className="text-muted-foreground font-normal md:hidden"> · Connected</span>
          </p>
          <p className="hidden text-xs text-muted-foreground md:block">Connected</p>
        </div>

        <div
          className={[
            "flex flex-col gap-2 rounded-xl border border-border/70 bg-card/70 p-2 sm:p-2.5 md:min-h-0 md:flex-1",
            omitNarrowRailVideos ? "max-md:gap-1 max-md:p-1.5" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className={omitNarrowRailVideos ? "max-md:hidden md:contents" : "contents"}>
            <RoomActivityVideoTiles
              peerLabel={peerLabel}
              myName={myName}
              peerInitials={peerInitials}
              remoteVideoLive={remoteVideoLive}
              localVideoLive={localVideoLive}
              remoteStream={remoteStream}
              localStream={localStream}
              narrowVideosSideBySide={narrowVideosSideBySide}
              className="md:min-h-0 md:flex-1"
            />
          </div>

          <div className="mt-1 md:mt-auto">{sidePanel}</div>
        </div>
      </div>

      <div
        className={[
          "order-1 flex w-full flex-1 flex-col rounded-xl border border-border/70 bg-card/65 p-2.5 sm:p-3 md:order-2 md:min-h-0",
          chessMobileDocumentFlow
            ? "max-md:flex-none max-md:overflow-visible max-md:px-1.5 max-md:pt-1.5 max-md:pb-1.5"
            : omitNarrowRailVideos
              ? "max-md:min-h-0 max-md:overflow-hidden max-md:p-2 max-md:pb-2"
              : "max-md:flex-none max-md:min-h-0 min-h-[min(48dvh,480px)]",
        ].join(" ")}
      >
        {title || subtitle ? (
          <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
            <div className="min-w-0">
              {title ? <p className="truncate text-sm font-semibold text-foreground">{title}</p> : null}
              {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
        ) : null}

        <div
          className={[
            "min-h-0 flex-1 overflow-x-hidden md:overflow-hidden",
            chessMobileDocumentFlow
              ? "flex flex-col max-md:flex-none max-md:overflow-visible max-md:min-h-0 touch-pan-y"
              : "overflow-y-auto [-webkit-overflow-scrolling:touch]",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div
            className={[
              "min-h-0",
              omitNarrowRailVideos && narrowScrollFooter
                ? "relative z-0 isolate max-md:overflow-x-visible md:flex-1 md:min-h-0 md:overflow-hidden"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {children}
          </div>

          {omitNarrowRailVideos && narrowScrollFooter ? (
            <div className="relative z-10 mt-4 w-full shrink-0 md:hidden">
              <div
                className={[
                  "flex flex-col gap-3 rounded-2xl border border-border/65 bg-card/92 p-3 shadow-[0_4px_28px_-6px_rgb(0_0_0_/0.18)]",
                  "ring-1 ring-border/25 backdrop-blur-[6px] supports-backdrop-filter:bg-card/88",
                  "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
                ].join(" ")}
              >
                <div className="flex flex-col gap-2">{narrowScrollFooter}</div>

                <div className="border-t border-border/45 pt-3">
                  <p className="truncate text-xs font-semibold text-foreground">
                    Private Room
                    <span className="text-muted-foreground font-normal"> · Connected</span>
                  </p>
                </div>

                <div className="border-t border-border/45 pt-3">{sidePanel}</div>
              </div>
            </div>
          ) : null}
        </div>

        {actions ? (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:mt-3">{actions}</div>
        ) : null}

        {footer ? (
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
