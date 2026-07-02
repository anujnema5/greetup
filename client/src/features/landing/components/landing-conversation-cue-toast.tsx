import { Info } from "lucide-react";
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
        "flex w-full items-start gap-3 rounded-2xl border-0 bg-popover px-4 py-3 text-popover-foreground shadow-lg backdrop-blur-sm",
        className,
      )}
      role="status"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-5 text-foreground">{title}</p>
        {cue.body ? (
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{cue.body}</p>
        ) : null}
      </div>
    </div>
  );
}
