'use client';

interface TypingIndicatorProps {
  userIds: string[];
}

export function TypingIndicator({ userIds }: TypingIndicatorProps) {
  const active = userIds.filter(Boolean);
  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 py-1.5 text-[11px] text-muted-foreground">
      <span className="flex gap-0.5" aria-hidden>
        <span className="animate-bounce [animation-delay:0ms]">•</span>
        <span className="animate-bounce [animation-delay:150ms]">•</span>
        <span className="animate-bounce [animation-delay:300ms]">•</span>
      </span>
      <span>
        {active.length === 1 ? 'typing…' : `${active.length} people typing…`}
      </span>
    </div>
  );
}
