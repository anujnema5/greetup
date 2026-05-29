"use client";

import { useEffect, useRef } from "react";
import { isCallRenderDebugEnabled, logCallRender } from "@/features/room/lib/debug/call-render-debug";

/** Logs render count when `localStorage.CALL_RENDER_DEBUG = "1"` (dev only). */
export function useCallRenderDebug(scope: string, detail?: Record<string, unknown>): void {
  const countRef = useRef(0);
  const detailRef = useRef(detail);
  detailRef.current = detail;

  useEffect(() => {
    if (!isCallRenderDebugEnabled()) return;
    countRef.current += 1;
    logCallRender(scope, { render: countRef.current, ...detailRef.current });
  });
}
