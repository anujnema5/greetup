import { RealtimeProviders } from "@/lib/providers/realtime-providers";
import { RequireOnboarding } from "@/features/auth/components/require-onboarding";

export default function RealtimeLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProviders>
      <RequireOnboarding>{children}</RequireOnboarding>
    </RealtimeProviders>
  );
}
