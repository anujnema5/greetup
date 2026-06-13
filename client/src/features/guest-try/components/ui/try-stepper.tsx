"use client";

import { Check } from "lucide-react";

import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";

import {
  isTryStepComplete,
  isTryStepReachable,
  isTryWizardStep,
  type TryWizardStep,
} from "../../lib/try-flow-steps";
import type { TryFlowStep } from "../../types/guest-try.types";

const STEPS = [
  { key: "name" as const, label: "Your name", shortLabel: "Name" },
  { key: "prefs" as const, label: "Your vibe", shortLabel: "Vibe" },
  { key: "match" as const, label: "Go live", shortLabel: "Match" },
] as const;

type TryStepperProps = {
  activeStep: TryFlowStep;
  furthestStep: TryWizardStep;
  onStepSelect?: (step: TryWizardStep) => void;
  variant?: "compact" | "sidebar" | "badge";
  className?: string;
};

function TryStepProgress({
  activeIndex,
  className,
}: {
  activeIndex: number;
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-white/8", className)}>
      <ProgressBar
        value={activeIndex + 1}
        max={STEPS.length}
        aria-label="Setup progress"
        className="h-1.5 [&::-webkit-progress-bar]:bg-white/8"
      />
    </div>
  );
}

export function TryStepper({
  activeStep,
  furthestStep,
  onStepSelect,
  variant = "compact",
  className,
}: TryStepperProps) {
  if (!isTryWizardStep(activeStep)) {
    return null;
  }

  const activeIndex = STEPS.findIndex((step) => step.key === activeStep);

  if (activeIndex < 0) {
    return null;
  }

  const handleSelect = (step: TryWizardStep) => {
    if (!isTryStepReachable(step, furthestStep) || step === activeStep) {
      return;
    }
    onStepSelect?.(step);
  };

  if (variant === "badge") {
    return (
      <p
        className={cn("shrink-0 text-sm text-muted-foreground", className)}
        aria-label={`Step ${activeIndex + 1} of ${STEPS.length}`}
      >
        Step {activeIndex + 1} of {STEPS.length}
      </p>
    );
  }

  if (variant === "sidebar") {
    return (
      <nav aria-label="Your progress" className={cn("space-y-6", className)}>
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Step {activeIndex + 1} of {STEPS.length}
          </p>
          <TryStepProgress activeIndex={activeIndex} />
        </div>

        <ol className="space-y-2">
          {STEPS.map((step, index) => {
            const isComplete = isTryStepComplete(step.key, furthestStep);
            const isCurrent = step.key === activeStep;
            const isReachable = isTryStepReachable(step.key, furthestStep);
            const isClickable = isReachable && !isCurrent && Boolean(onStepSelect);

            const content = (
              <>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    isCurrent && "bg-primary text-primary-foreground",
                    isComplete && !isCurrent && "bg-primary/15 text-primary",
                    !isCurrent && !isComplete && "bg-white/6 text-muted-foreground",
                  )}
                >
                  {isComplete ? <Check className="size-4" aria-hidden /> : index + 1}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isCurrent && "text-foreground",
                      isComplete && !isCurrent && "text-muted-foreground",
                      !isCurrent && !isComplete && "text-muted-foreground/60",
                    )}
                  >
                    {step.label}
                  </p>
                </div>
              </>
            );

            return (
              <li key={step.key} aria-current={isCurrent ? "step" : undefined}>
                {isClickable ? (
                  <button
                    type="button"
                    onClick={() => handleSelect(step.key)}
                    aria-label={`Go to ${step.label}`}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                      "border-white/6 bg-white/[0.02] hover:border-primary/25 hover:bg-primary/5",
                      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    )}
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors",
                      isCurrent && "border-primary/30 bg-primary/8",
                      isComplete && !isCurrent && "border-white/6 bg-white/[0.02]",
                      !isCurrent && !isComplete && "border-transparent bg-transparent",
                    )}
                  >
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Your progress" className={cn("w-full space-y-3", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          Step {activeIndex + 1} of {STEPS.length}
        </span>
        <span className="text-muted-foreground">{STEPS[activeIndex].label}</span>
      </div>
      <TryStepProgress activeIndex={activeIndex} />
      <ol className="flex justify-between gap-2">
        {STEPS.map((step) => {
          const isComplete = isTryStepComplete(step.key, furthestStep);
          const isCurrent = step.key === activeStep;
          const isReachable = isTryStepReachable(step.key, furthestStep);
          const isClickable = isReachable && !isCurrent && Boolean(onStepSelect);

          if (isClickable) {
            return (
              <li key={step.key} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => handleSelect(step.key)}
                  aria-label={`Go to ${step.label}`}
                  className={cn(
                    "w-full truncate rounded-md px-1 py-1 text-center text-xs font-medium transition-colors sm:text-sm",
                    "text-muted-foreground hover:bg-white/6 hover:text-foreground",
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  )}
                >
                  {step.shortLabel}
                </button>
              </li>
            );
          }

          return (
            <li
              key={step.key}
              className={cn(
                "min-w-0 flex-1 truncate text-center text-xs font-medium sm:text-sm",
                isCurrent && "text-primary",
                isComplete && !isCurrent && "text-muted-foreground",
                !isCurrent && !isComplete && "text-muted-foreground/50",
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              {step.shortLabel}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
