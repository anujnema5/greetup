import { RealtimeProviders } from "@/lib/providers/realtime-providers";

export default function RealtimeLayout({ children }: { children: React.ReactNode }) {
  return <RealtimeProviders>{children}</RealtimeProviders>;
}
