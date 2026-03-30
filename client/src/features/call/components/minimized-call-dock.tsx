"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsCallActive, selectIsCallMinimized } from "@/lib/redux/selectors/call-selectors";
import { endCall, expandCall } from "@/lib/redux/slices/callSlice";
import {
  clearCallSession,
  broadcastCallMessage,
  clearCallMinimized,
} from "@/features/call/lib/call-sync";
import { MOCK_MATCH } from "@/features/call/constants/mock-match";
import { cn } from "@/lib/utils";
import { Maximize2, PhoneOff, SkipForward, Video } from "lucide-react";

const DOCK_OFFSET_STORAGE = "circlo-minimized-dock-drag";

function clampDragToViewport(
  el: HTMLElement,
  drag: { x: number; y: number }
): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  const m = 8;
  let { x, y } = drag;
  if (r.left < m) x += m - r.left;
  if (r.top < m) y += m - r.top;
  if (r.right > window.innerWidth - m) x -= r.right - (window.innerWidth - m);
  if (r.bottom > window.innerHeight - m)
    y -= r.bottom - (window.innerHeight - m);
  return { x, y };
}

export function MinimizedCallDock() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const isActive = useAppSelector(selectIsCallActive);
  const isMinimized = useAppSelector(selectIsCallMinimized);

  const isFullRoom = pathname.startsWith("/room");

  const visible = isActive && isMinimized && !isFullRoom;

  const cardRef = useRef<HTMLDivElement>(null);
  /** Drag offset — updated imperatively during move (no React re-render). */
  const posRef = useRef({ x: 0, y: 0 });
  const dragSession = useRef<{ lastX: number; lastY: number } | null>(null);

  const applyTransform = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const { x, y } = posRef.current;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }, []);

  const clampAndApply = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const { x, y } = posRef.current;
    el.style.transform = `translate(${x}px, ${y}px)`;
    const c = clampDragToViewport(el, { x, y });
    posRef.current = c;
    el.style.transform = `translate(${c.x}px, ${c.y}px)`;
  }, []);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible) return;
    const el = cardRef.current;
    if (!el) return;
    try {
      const raw = sessionStorage.getItem(DOCK_OFFSET_STORAGE);
      if (raw) {
        const p = JSON.parse(raw) as { x?: number; y?: number };
        if (typeof p.x === "number" && typeof p.y === "number") {
          posRef.current = { x: p.x, y: p.y };
        } else {
          posRef.current = { x: 0, y: 0 };
        }
      } else {
        posRef.current = { x: 0, y: 0 };
      }
    } catch {
      posRef.current = { x: 0, y: 0 };
    }
    applyTransform();
    clampAndApply();
  }, [visible, applyTransform, clampAndApply]);

  /** Re-apply transform after any re-render so React's inline `style` never drops it (e.g. timer tick). */
  useLayoutEffect(() => {
    if (!visible) return;
    applyTransform();
  }, [visible, applyTransform, elapsed]);

  useEffect(() => {
    if (!visible) return;
    const onResize = () => {
      clampAndApply();
      try {
        sessionStorage.setItem(
          DOCK_OFFSET_STORAGE,
          JSON.stringify(posRef.current)
        );
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [visible, clampAndApply]);

  const handleExpand = useCallback(() => {
    dispatch(expandCall());
    clearCallMinimized();
    router.push("/room");
  }, [dispatch, router]);

  const handleEnd = useCallback(() => {
    try {
      sessionStorage.removeItem(DOCK_OFFSET_STORAGE);
    } catch {
      /* ignore */
    }
    clearCallSession();
    dispatch(endCall());
    broadcastCallMessage({ type: "END_CALL" });
  }, [dispatch]);

  const handleSkip = useCallback(() => {
    try {
      sessionStorage.removeItem(DOCK_OFFSET_STORAGE);
    } catch {
      /* ignore */
    }
    clearCallSession();
    dispatch(endCall());
    broadcastCallMessage({ type: "SKIP_CALL" });
    router.replace("/explore");
  }, [dispatch, router]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const onDragPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragSession.current = { lastX: e.clientX, lastY: e.clientY };
  }, []);

  const onDragPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragSession.current) return;
      const dx = e.clientX - dragSession.current.lastX;
      const dy = e.clientY - dragSession.current.lastY;
      dragSession.current.lastX = e.clientX;
      dragSession.current.lastY = e.clientY;
      posRef.current.x += dx;
      posRef.current.y += dy;
      applyTransform();
      clampAndApply();
    },
    [applyTransform, clampAndApply]
  );

  const onDragPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragSession.current) return;
      dragSession.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      clampAndApply();
      try {
        sessionStorage.setItem(
          DOCK_OFFSET_STORAGE,
          JSON.stringify(posRef.current)
        );
      } catch {
        /* ignore */
      }
    },
    [clampAndApply]
  );

  if (!visible) return null;

  return (
    <div
      ref={cardRef}
      className={cn(
        "fixed z-200 flex max-h-[min(92dvh,calc(100vh-1rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[oklch(8%_0.01_110)] shadow-2xl max-md:rounded-xl",
        "w-[min(25rem,calc(100vw-1.25rem))]",
        "max-md:bottom-[5.25rem] max-md:right-3",
        "md:bottom-4 md:right-4"
      )}
      style={{
        boxShadow:
          "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
        touchAction: "manipulation",
      }}
    >
      {/* Video area: drag here; default cursor; direct DOM transform while moving */}
      <div
        aria-label="Move call window"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
        className={cn(
          "relative w-full shrink-0 cursor-default overflow-hidden select-none touch-none",
          "h-[11rem] min-h-[11rem] sm:h-[12.75rem] sm:min-h-[12.75rem] md:h-[14rem] md:min-h-[14rem]"
        )}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(145deg, ${MOCK_MATCH.gradFrom}40, oklch(12% 0.02 110) 45%, ${MOCK_MATCH.gradTo}35)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 3px)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg sm:h-[5.25rem] sm:w-[5.25rem] sm:text-[1.75rem] md:h-[5.75rem] md:w-[5.75rem] md:text-3xl"
            style={{
              background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}, ${MOCK_MATCH.gradTo})`,
              boxShadow: `0 0 36px ${MOCK_MATCH.gradFrom}66`,
            }}
          >
            {MOCK_MATCH.initials}
          </div>
        </div>
        <div
          className={cn(
            "pointer-events-none absolute overflow-hidden rounded-lg shadow-lg sm:rounded-xl",
            "bottom-2.5 right-2.5 h-[3.5rem] w-[5rem] sm:bottom-3 sm:right-3 sm:h-[4rem] sm:w-[5.5rem] md:h-[4.25rem] md:w-[6rem]"
          )}
          style={{
            border: "2px solid rgba(255,255,255,0.2)",
            boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
          }}
        >
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, oklch(28% 0.04 105), oklch(18% 0.02 110))",
            }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold sm:h-9 sm:w-9 sm:text-xs"
              style={{
                background:
                  "radial-gradient(circle at 40% 35%, oklch(90% 0.11 105), oklch(78% 0.10 105))",
                color: "oklch(22% 0.03 110)",
              }}
            >
              A
            </div>
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/75 to-transparent px-3 pb-10 pt-2.5 sm:px-3.5 sm:pb-12 sm:pt-3"
          style={{ userSelect: "none" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
              }}
            >
              <span className="h-1 w-1 shrink-0 rounded-full bg-red-400" />
              <span className="text-[9px] font-bold tracking-wider text-white">
                LIVE
              </span>
            </div>
            <p className="truncate text-xs font-semibold text-white sm:text-[13px]">
              {MOCK_MATCH.name}
            </p>
          </div>
          <div className="pointer-events-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            <div
              className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold text-white/85"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {fmt(elapsed)}
            </div>
            <button
              type="button"
              aria-label="Open full call"
              onClick={handleExpand}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/90 hover:bg-white/10 sm:h-9 sm:w-9"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
              }}
            >
              <Maximize2 size={15} strokeWidth={2} className="sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-2 left-2.5 flex items-center gap-1.5 rounded-md bg-black/35 px-2 py-1 backdrop-blur-sm sm:bottom-2.5 sm:left-3">
          <Video size={11} className="text-white/70" />
          <span className="text-[9px] font-medium text-white/65 sm:text-[10px]">
            Video
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-white/10 px-2.5 py-3 sm:gap-3 sm:px-4 sm:py-3.5">
        <button
          type="button"
          onClick={handleSkip}
          className="flex min-h-[44px] min-w-[6.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-4 py-1.5 text-white/85 hover:bg-white/10 sm:min-h-0 sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5"
        >
          <SkipForward size={18} className="shrink-0 sm:size-[18px]" />
          <span className="text-[10px] font-medium sm:text-xs">Skip</span>
        </button>
        <button
          type="button"
          onClick={handleEnd}
          className="flex min-h-[44px] min-w-[6.5rem] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-red-500 px-4 py-1.5 text-white hover:bg-red-400 sm:min-h-0 sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5"
        >
          <PhoneOff size={18} className="shrink-0 sm:size-[18px]" />
          <span className="text-[10px] font-medium sm:text-xs">End</span>
        </button>
      </div>
    </div>
  );
}
