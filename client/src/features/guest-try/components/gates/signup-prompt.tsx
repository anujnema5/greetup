"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  GUEST_TRIAL_MATCH,
  GUEST_TRIAL_SIGNUP_GATE,
} from "@/lib/copy/user-messages";

import { TRY_LOGIN_ROUTE, TRY_SIGNUP_ROUTE } from "../../constants/try-routes";
import type { TryBackTarget } from "../../types/guest-try.types";
import { TryContinueButton } from "../ui/try-continue-button";
import { TryGateLayout } from "../layout/try-gate-layout";

type SignupPromptProps = {
  displayName?: string | null;
  mergeAvailable?: boolean;
  back?: TryBackTarget;
  variant?: "default" | "limit" | "device-used";
};

export function SignupPrompt({
  displayName = null,
  mergeAvailable = false,
  back = { href: "/" },
  variant = "default",
}: SignupPromptProps) {
  const title =
    variant === "device-used"
      ? GUEST_TRIAL_SIGNUP_GATE.deviceUsedTitle
      : variant === "limit"
        ? GUEST_TRIAL_SIGNUP_GATE.limitTitle
        : GUEST_TRIAL_SIGNUP_GATE.title;
  const description =
    variant === "device-used"
      ? GUEST_TRIAL_SIGNUP_GATE.deviceUsedSubtitle
      : variant === "limit"
        ? GUEST_TRIAL_MATCH.retriesExhausted
        : GUEST_TRIAL_SIGNUP_GATE.subtitle(displayName);
  const showBenefits = variant === "default" || variant === "device-used";

  const actions = (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
      <TryContinueButton asChild fullWidth className="sm:flex-1">
        <Link href={TRY_SIGNUP_ROUTE}>{GUEST_TRIAL_SIGNUP_GATE.primaryCta}</Link>
      </TryContinueButton>
      <Button
        asChild
        variant="outline"
        size="default"
        className="w-full sm:flex-1"
      >
        <Link href={TRY_LOGIN_ROUTE}>{GUEST_TRIAL_SIGNUP_GATE.secondaryCta}</Link>
      </Button>
    </div>
  );

  return (
    <TryGateLayout title={title} description={description} actions={actions} back={back}>
      {mergeAvailable ? (
        <p className="max-w-xl text-sm leading-relaxed text-primary/90 sm:text-[0.9375rem]">
          {GUEST_TRIAL_SIGNUP_GATE.mergeHint}
        </p>
      ) : null}

      {showBenefits ? (
        <ul className="max-w-xl space-y-4">
          {GUEST_TRIAL_SIGNUP_GATE.benefits.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-3.5 rounded-xl border border-border bg-muted/30 px-4 py-3.5 text-left text-sm leading-relaxed text-foreground sm:text-[0.9375rem] lg:px-5 lg:py-4"
            >
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12">
                <Check className="size-3.5 text-primary" strokeWidth={2.5} aria-hidden />
              </span>
              <span className="pt-0.5">{benefit}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </TryGateLayout>
  );
}
