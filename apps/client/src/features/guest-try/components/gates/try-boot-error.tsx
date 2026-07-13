"use client";

import { GUEST_TRIAL_FLOW, GUEST_TRIAL_NAV } from "@/lib/copy/user-messages";

import { TryContinueButton } from "../ui/try-continue-button";
import { TryGateLayout } from "../layout/try-gate-layout";
import type { TryBackTarget } from "../../types/guest-try.types";

type TryBootErrorProps = {
  message?: string;
  onRetry: () => void;
  back?: TryBackTarget;
};

export function TryBootError({
  message = GUEST_TRIAL_FLOW.errors.bootBody,
  onRetry,
  back = { href: "/" },
}: TryBootErrorProps) {
  return (
    <TryGateLayout
      title={GUEST_TRIAL_FLOW.errors.bootTitle}
      description={message}
      back={back}
      actions={
        <TryContinueButton type="button" fullWidth onClick={onRetry}>
          {GUEST_TRIAL_NAV.tryAgain}
        </TryContinueButton>
      }
    />
  );
}
