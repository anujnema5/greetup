"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ChangePhoneDialog } from "@/features/settings/components/change-phone-dialog";
import { useSession } from "@/lib/auth-client";

function sessionPhone(user: unknown): string | null {
  if (!user || typeof user !== "object") return null;
  const p = (user as { phoneNumber?: string | null }).phoneNumber;
  return typeof p === "string" && p.trim() ? p : null;
}

export function PhoneNumberSettingsCard() {
  const { data: session } = useSession();
  const current = sessionPhone(session?.user ?? null);
  const [dialogOpen, setDialogOpen] = useState(false);
  /** Remount dialog on each open so step/forms reset without setState-in-effect. */
  const [dialogInstance, setDialogInstance] = useState(0);

  return (
    <>
      <div className="rounded-xl border border-border bg-card/50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold text-foreground">Phone number</h2>
            <p className="text-sm text-muted-foreground">
              Used for sign-in with SMS. We&apos;ll send a code to confirm a new number.
            </p>
            {current ? (
              <p className="pt-1 text-sm text-foreground">
                <span className="text-muted-foreground">Current: </span>
                <span className="font-medium tabular-nums">{current}</span>
              </p>
            ) : (
              <p className="pt-1 text-sm text-muted-foreground">No phone on file yet.</p>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={() => {
              setDialogInstance((n) => n + 1);
              setDialogOpen(true);
            }}
          >
            {current ? "Change" : "Add phone"}
          </Button>
        </div>
      </div>

      <ChangePhoneDialog
        key={dialogInstance}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentPhone={current}
      />
    </>
  );
}
