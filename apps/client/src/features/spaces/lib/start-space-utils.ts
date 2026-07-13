/** Date/time helpers for scheduling a circle (no React). */

export function combineDateAndTime(date: Date, timeHHmm: string): Date {
  const parts = timeHHmm.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const out = new Date(date);
  out.setHours(h, m, 0, 0);
  return out;
}

export function defaultScheduleDateOneHourAhead(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}
