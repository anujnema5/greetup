import { UserPlus, Check, Clock } from "lucide-react";

import type { PublicProfileConnectionPanel } from "../lib/public-profile-connection";

type Props = {
  panel: PublicProfileConnectionPanel;
  isSubmitting: boolean;
  onConnect: () => void;
};

export function PublicProfileConnectionActions({
  panel,
  isSubmitting,
  onConnect,
}: Props) {
  if (panel.kind === "none") {
    return null;
  }

  if (panel.kind === "connect") {
    return (
      <button
        type="button"
        onClick={onConnect}
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-60 transition-opacity"
      >
        <UserPlus size={18} aria-hidden />
        {isSubmitting ? "Sending…" : "Connect"}
      </button>
    );
  }

  if (panel.kind === "pending_outgoing") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <Clock size={16} aria-hidden />
        Request pending
      </div>
    );
  }

  if (panel.kind === "pending_incoming") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        <Clock size={16} aria-hidden />
        This person invited you — respond in Connections
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
      <Check size={16} aria-hidden />
      Connected
    </div>
  );
}
