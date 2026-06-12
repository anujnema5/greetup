"use client";

import { RedirectToGuestRegister } from "../components/redirect-to-guest-register";

/** Legacy route — forwards to guest register with merge intent. */
export function TryCompletePage() {
  return <RedirectToGuestRegister />;
}
