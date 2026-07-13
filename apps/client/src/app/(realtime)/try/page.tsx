import type { Metadata } from "next";

import { TryPage as GuestTryPage } from "@/features/guest-try";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Start connecting live",
  description:
    "Set your vibe, find a match, and start a live conversation. No signup required to begin.",
  path: "/try",
});

export default function TryPage() {
  return <GuestTryPage />;
}
