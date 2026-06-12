import type { Metadata } from "next";

import { TryCompletePage as GuestTryCompletePage } from "@/features/guest-try";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Create your account",
  description: "Sign up or log in to keep matching and save your preferences.",
  path: "/try/complete",
});

export default function TryCompletePage() {
  return <GuestTryCompletePage />;
}
