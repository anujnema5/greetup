"use client";

type GenericActivityStageProps = {
  label: string;
  onExit: () => void;
};

export function GenericActivityStage({ label, onExit }: GenericActivityStageProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-linear-to-br from-primary/20 via-background/50 to-background px-6 text-center">
      <p className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-primary">
        ACTIVITY LIVE
      </p>
      <h3 className="mt-4 text-2xl font-semibold text-foreground md:text-3xl">{label}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Communication stays persistent while the activity is in focus.
      </p>
      <button
        type="button"
        onClick={onExit}
        className="mt-5 rounded-lg border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/80"
      >
        Exit activity
      </button>
    </div>
  );
}
