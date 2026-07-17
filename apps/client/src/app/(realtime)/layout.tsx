import { RealtimeProviders } from "@/lib/providers/realtime-providers";
import { RequireOnboarding } from "@/features/auth/components/require-onboarding";

/**
 * Auth-gated app shell — must not static-prerender as RSC-only.
 * A cached `text/x-component` payload (s-maxage=1y) breaks full page loads
 * on phones/hard refreshes (raw flight data instead of HTML).
 */
export const dynamic = "force-dynamic";

export default function RealtimeLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProviders>
      <RequireOnboarding>{children}</RequireOnboarding>
    </RealtimeProviders>
  );
}
