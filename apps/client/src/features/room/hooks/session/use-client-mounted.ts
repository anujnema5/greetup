"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True on the client after hydration — false during SSR (avoids hydration mismatch on search route). */
export function useClientMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
  