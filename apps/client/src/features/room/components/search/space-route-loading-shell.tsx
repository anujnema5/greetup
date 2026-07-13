import { BrandSpinner } from "@/components/brand-spinner";

export function SpaceRouteLoadingShell({ message = "Connecting to room…" }: { message?: string }) {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-background">
      <BrandSpinner label={message} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
