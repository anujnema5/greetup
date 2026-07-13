"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { GUEST_TRIAL_FLOW } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import { isTryWizardStep, type TryWizardStep } from "../../lib/try-flow-steps";
import type { TryFlowStep } from "../../types/guest-try.types";
import { TryStepper } from "../ui/try-stepper";

const INTERACTIVE =
  "[&_button:not(:disabled)]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_a]:cursor-pointer";

type TryLayoutProps = {
  children: ReactNode;
  activeStep?: TryFlowStep;
  furthestStep?: TryWizardStep;
  onStepSelect?: (step: TryWizardStep) => void;
  headline?: string;
  subheadline?: string;
  showTagline?: boolean;
  compact?: boolean;
};

export function TryLayout({
  children,
  activeStep,
  furthestStep,
  onStepSelect,
  headline,
  subheadline,
  showTagline = true,
  compact = false,
}: TryLayoutProps) {
  const showStepper =
    activeStep === "name" || activeStep === "prefs" || activeStep === "match";
  const stepperFurthest: TryWizardStep | null =
    furthestStep ?? (activeStep && isTryWizardStep(activeStep) ? activeStep : null);
  const isWizard = showStepper && Boolean(activeStep);

  return (
    <div
      className={cn(
        "relative min-h-dvh overflow-x-hidden bg-background text-foreground",
        INTERACTIVE,
      )}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-primary/6 blur-[100px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-primary/4 blur-[90px]" />
        <div className="absolute -bottom-40 left-1/4 h-[420px] w-[420px] rounded-full bg-primary/5 blur-[80px]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <header
          className={cn(
            "flex shrink-0 items-center justify-between gap-4",
            isWizard ? "mb-4 lg:mb-5" : compact ? "mb-4 sm:mb-5" : "mb-6 lg:mb-8",
          )}
        >
          <Link
            href="/"
            aria-label="Greetup home"
            className="inline-flex rounded-lg outline-offset-4 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            {showStepper && activeStep && stepperFurthest ? (
              <TryStepper
                activeStep={activeStep}
                furthestStep={stepperFurthest}
                onStepSelect={onStepSelect}
                variant="badge"
                className="lg:hidden"
              />
            ) : null}
            <ThemeToggle />
          </div>
        </header>

        {headline ? (
          <div className="mb-8 max-w-3xl space-y-2">
            <p className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {headline}
            </p>
            {subheadline ? (
              <p className="text-base leading-relaxed text-muted-foreground">{subheadline}</p>
            ) : null}
          </div>
        ) : showTagline && !showStepper ? (
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {GUEST_TRIAL_FLOW.tagline}
          </p>
        ) : null}

        <div
          className={cn(
            showStepper && activeStep
              ? "grid lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] lg:items-start lg:gap-10 xl:gap-12"
              : "flex flex-1 flex-col",
          )}
        >
          {showStepper && activeStep && stepperFurthest ? (
            <aside
              aria-label="Setup steps"
              className="hidden lg:sticky lg:top-8 lg:block lg:self-start"
            >
              <TryStepper
                activeStep={activeStep}
                furthestStep={stepperFurthest}
                onStepSelect={onStepSelect}
                variant="sidebar"
              />
            </aside>
          ) : null}

          <main className={cn("flex min-w-0 flex-1 flex-col", showStepper && "lg:col-start-2")}>
            {showStepper && activeStep && stepperFurthest ? (
              <div className="mb-5 lg:hidden">
                <TryStepper
                  activeStep={activeStep}
                  furthestStep={stepperFurthest}
                  onStepSelect={onStepSelect}
                  variant="compact"
                />
              </div>
            ) : null}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
