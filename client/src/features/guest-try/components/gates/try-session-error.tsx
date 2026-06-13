"use client";

import { GUEST_TRIAL_FLOW } from "@/lib/copy/user-messages";

import { TryContinueButton } from "../ui/try-continue-button";
import { TryGateLayout } from "../layout/try-gate-layout";
import type { TryBackTarget } from "../../types/guest-try.types";

type TrySessionErrorProps = {
  onStartFresh: () => void;
  back?: TryBackTarget;
};

export function TrySessionError({ onStartFresh, back = { href: "/" } }: TrySessionErrorProps) {
  return (
    <TryGateLayout
      title={GUEST_TRIAL_FLOW.errors.sessionTitle}
      description={GUEST_TRIAL_FLOW.errors.sessionBody}
      back={back}
      actions={
        <TryContinueButton type="button" fullWidth onClick={onStartFresh}>
          Start fresh
        </TryContinueButton>
      }
    />
  );
}
