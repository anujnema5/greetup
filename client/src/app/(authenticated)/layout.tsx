import { AuthenticatedProviders } from "@/features/app-shell/components/authenticated-providers";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedProviders>{children}</AuthenticatedProviders>;
}
