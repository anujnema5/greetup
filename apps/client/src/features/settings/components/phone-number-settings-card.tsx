"use client";

import { useState } from "react";
import { Phone, ChevronRight } from "lucide-react";

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
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/60 active:bg-muted/80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={() => {
          setDialogInstance((n) => n + 1);
          setDialogOpen(true);
        }}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
          <Phone className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-foreground">Phone number</p>
            <span
              className={[
                "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
                current
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {current ? "Verified" : "Not set"}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-muted-foreground">
            {current ?? "Add a number for SMS sign-in"}
          </p>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
      </button>

      <ChangePhoneDialog
        key={dialogInstance}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentPhone={current}
      />
    </>
  );
}
