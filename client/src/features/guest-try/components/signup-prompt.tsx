"use client";

import Link from "next/link";
import { Check, Heart, PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  GUEST_TRIAL_MATCH,
  GUEST_TRIAL_NAV,
  GUEST_TRIAL_SIGNUP_GATE,
} from "@/lib/copy/user-messages";

import { TRY_LOGIN_ROUTE, TRY_SIGNUP_ROUTE } from "../constants/try-routes";
import { TryBackButton, type TryBackTarget } from "./try-back-button";
import { TryContinueButton } from "./try-continue-button";
import { TryStepActions } from "./try-step-actions";
import { TryStepFrame } from "./try-step-frame";

type SignupPromptProps = {
  displayName?: string | null;
  mergeAvailable?: boolean;
  back?: TryBackTarget;
  variant?: "default" | "limit";
};

export function SignupPrompt({
  displayName = null,
  mergeAvailable = false,
  back = { href: "/" },
  variant = "default",
}: SignupPromptProps) {
  const title =
    variant === "limit" ? GUEST_TRIAL_SIGNUP_GATE.limitTitle : GUEST_TRIAL_SIGNUP_GATE.title;
  const description =
    variant === "limit"
      ? GUEST_TRIAL_MATCH.retriesExhausted
      : GUEST_TRIAL_SIGNUP_GATE.subtitle(displayName);

  const footer = (
    <div className="space-y-3">
      <TryStepActions
        primary={
          <TryContinueButton asChild>
            <Link href={TRY_SIGNUP_ROUTE}>{GUEST_TRIAL_SIGNUP_GATE.primaryCta}</Link>
          </TryContinueButton>
        }
        secondary={
          <Button asChild variant="outline" size="default" className="w-full sm:w-auto">
            <Link href={TRY_LOGIN_ROUTE}>{GUEST_TRIAL_NAV.logIn}</Link>
          </Button>
        }
      />
      <TryBackButton back={back} />
    </div>
  );

  return (
    <TryStepFrame
      icon={variant === "limit" ? Heart : PartyPopper}
      title={title}
      description={description}
      align="center"
      footer={footer}
      width="narrow"
    >
      <div className="mx-auto max-w-lg space-y-5">
        {mergeAvailable ? (
          <p className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm leading-relaxed text-foreground sm:text-base">
            {GUEST_TRIAL_SIGNUP_GATE.mergeHint}
          </p>
        ) : null}

        {variant === "default" ? (
          <ul className="space-y-4 text-sm text-muted-foreground sm:text-base">
            {GUEST_TRIAL_SIGNUP_GATE.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="size-3.5 text-primary" aria-hidden />
                </span>
                <span className="leading-relaxed">{benefit}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </TryStepFrame>
  );
}
