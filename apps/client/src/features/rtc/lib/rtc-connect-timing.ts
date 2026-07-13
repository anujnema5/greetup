const PREFIX = "rtc-connect";

const MEASURE_PAIRS: ReadonlyArray<[string, string]> = [
  ["join-start", "join-done"],
  ["join-done", "token-start"],
  ["token-start", "token-ready"],
  ["token-ready", "socket-connected"],
  ["socket-connected", "join-ack"],
  ["join-ack", "transports-ready"],
  ["transports-ready", "mediasoup-ready"],
  ["join-start", "mediasoup-ready"],
];

function markName(name: string): string {
  return `${PREFIX}:${name}`;
}

function measureName(from: string, to: string): string {
  return `${PREFIX}:${from}->${to}`;
}

/** Clears prior marks/measures before a new connect attempt. */
export function resetRtcConnectTiming(): void {
  if (typeof performance === "undefined") return;
  for (const [from, to] of MEASURE_PAIRS) {
    performance.clearMeasures(measureName(from, to));
  }
  for (const name of new Set(MEASURE_PAIRS.flat())) {
    performance.clearMarks(markName(name));
  }
}

export function rtcMark(name: string): void {
  if (typeof performance === "undefined") return;
  performance.mark(markName(name));
}

function rtcMeasure(from: string, to: string): PerformanceMeasure | null {
  if (typeof performance === "undefined") return null;
  const label = measureName(from, to);
  try {
    return performance.measure(label, markName(from), markName(to));
  } catch {
    return null;
  }
}

/** Logs stage durations to the console (dev diagnostics). */
export function logRtcConnectTiming(roomId: string): void {
  const rows: Array<{ stage: string; ms: number | null }> = [];

  for (const [from, to] of MEASURE_PAIRS) {
    const measure = rtcMeasure(from, to);
    rows.push({
      stage: `${from} → ${to}`,
      ms: measure ? Math.round(measure.duration) : null,
    });
  }

  console.groupCollapsed(`[RTC timing] room=${roomId}`);
  console.table(rows);
  console.groupEnd();
}
