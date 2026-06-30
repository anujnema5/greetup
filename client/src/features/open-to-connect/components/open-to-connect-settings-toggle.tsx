"use client";

import { Loader2, Radio } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import { useDisableOpenToConnect, useEnableOpenToConnect } from "../api/open-to-connect.mutations";
import { useOpenToConnectMe } from "../api/open-to-connect.queries";

type Props = {
  className?: string;
};

export function OpenToConnectSettingsToggle({ className }: Props) {
  const { data: me, isLoading } = useOpenToConnectMe();
  const enable = useEnableOpenToConnect();
  const disable = useDisableOpenToConnect();

  const isOpen = me?.openToConnect === true;
  const pausedInRoom = me?.pausedForRoom === true;
  const busy = enable.isPending || disable.isPending;

  const summary = pausedInRoom
    ? OPEN_TO_CONNECT.settings.summaryPaused
    : isOpen
      ? OPEN_TO_CONNECT.settings.summaryOn
      : OPEN_TO_CONNECT.settings.summaryOff;

  const handleToggle = (checked: boolean) => {
    if (busy || checked === isOpen) return;
    if (checked) enable.mutate({});
    else disable.mutate();
  };

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5",
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
        <Radio className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">{OPEN_TO_CONNECT.settings.label}</p>
        {isLoading ? (
          <span className="mt-0.5 block h-3.5 w-40 animate-pulse rounded bg-muted" />
        ) : (
          <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground leading-snug">
            {summary}
          </p>
        )}
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
      ) : (
        <Switch
          checked={isOpen}
          disabled={busy}
          onCheckedChange={handleToggle}
          aria-label={OPEN_TO_CONNECT.settings.label}
        />
      )}
    </div>
  );
}
