import { cn } from "@/lib/utils";

export type LandingConversationCue = {
  emoji?: string;
  title: string;
  body?: string | null;
};

type LandingConversationCueToastProps = {
  cue: LandingConversationCue;
  className?: string;
};

/** Mirrors in-call Sonner `toast.info` styling for conversation cues. */
export function LandingConversationCueToast({
  cue,
  className,
}: LandingConversationCueToastProps) {
  const title = cue.emoji ? `${cue.emoji} ${cue.title}` : cue.title;

  return (
    <div
      className={cn(
        "w-full rounded-2xl border-0 bg-popover px-4 py-3 text-popover-foreground shadow-lg backdrop-blur-sm",
        className,
      )}
      role="status"
    >
      <p className="text-sm font-semibold leading-5 text-foreground">{title}</p>
      {cue.body ? (
        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{cue.body}</p>
      ) : null}
    </div>
  );
}
