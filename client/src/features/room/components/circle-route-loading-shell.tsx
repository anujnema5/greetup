export function CircleRouteLoadingShell({ message = "Connecting to room…" }: { message?: string }) {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background text-sm text-muted-foreground">
      {message}
    </div>
  );
}
