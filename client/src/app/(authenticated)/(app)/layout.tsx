import { AppRouteLayout } from "@/features/app-shell/components/app-route-layout";

export default function AppShellRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppRouteLayout>{children}</AppRouteLayout>;
}
