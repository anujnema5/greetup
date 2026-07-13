import { TRY_ROUTE, TRY_SIGNUP_ROUTE } from "../constants/try-routes";
import type { TryBackTarget, TryFlowStep } from "../types/guest-try.types";

const TRY_CONSUMED_STORAGE_KEY = "guest_try_consumed";

export function markTryConsumedLocally(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(TRY_CONSUMED_STORAGE_KEY, "1");
}

export function clearTryConsumedLocally(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(TRY_CONSUMED_STORAGE_KEY);
}

export function isTryConsumedLocally(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return sessionStorage.getItem(TRY_CONSUMED_STORAGE_KEY) === "1";
}

export function isTryReturnPath(path: string): boolean {
  return path === TRY_ROUTE || path.startsWith(`${TRY_ROUTE}/`);
}

/** After a try call, send guests to register — not back on `/try`. */
export function resolveTryPostCallPath(returnPath: string, fallback = "/home"): string {
  const path = returnPath.trim() || fallback;
  if (isTryReturnPath(path) && isTryConsumedLocally()) {
    return TRY_SIGNUP_ROUTE;
  }
  return path;
}

export function shouldGuestSkipRematch(): boolean {
  return isTryConsumedLocally();
}

export function getTryBackTarget(
  step: TryFlowStep,
  goToName: () => void,
  goToPrefs: () => void,
): TryBackTarget {
  if (step === "name") {
    return { href: "/" };
  }
  if (step === "prefs") {
    return { onClick: goToName };
  }
  if (step === "match") {
    return { onClick: goToPrefs };
  }
  return { href: "/" };
}
