"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  checkUsernameAvailability,
  fetchUsernameSuggestions,
} from "@/features/profile-setup/api/username.queries";
import {
  isValidUsernameFormat,
  normalizeUsername,
  profileLinkPath,
  sanitizeUsernameInput,
  usernamePlaceholderFromDisplayName,
  USERNAME_VIBES,
  type UsernameVibe,
} from "@/features/profile/lib/username";

type UsernamePickerFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  displayName?: string | null;
  description?: string;
  className?: string;
};

type AvailabilityState = "idle" | "checking" | "available" | "taken" | "invalid";

export function UsernamePickerField({
  id = "username-picker",
  value,
  onChange,
  onBlur,
  disabled,
  displayName,
  className,
}: UsernamePickerFieldProps) {
  const [showGenerated, setShowGenerated] = useState(false);
  const [vibe, setVibe] = useState<UsernameVibe>("random");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityState>("idle");
  const checkRequestId = useRef(0);

  const normalized = normalizeUsername(value);
  const linkPath = profileLinkPath(normalized);
  const inputPlaceholder = usernamePlaceholderFromDisplayName(displayName);
  const listedSuggestions = suggestions.slice(0, 5);

  const loadSuggestions = useCallback(async (nextVibe: UsernameVibe) => {
    setIsLoadingSuggestions(true);
    try {
      const result = await fetchUsernameSuggestions({ vibe: nextVibe, limit: 5 });
      setSuggestions(result.suggestions);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (!normalized) {
      setAvailability("idle");
      return;
    }

    if (!isValidUsernameFormat(normalized)) {
      setAvailability("invalid");
      return;
    }

    const requestId = ++checkRequestId.current;
    setAvailability("checking");

    const timer = window.setTimeout(() => {
      void checkUsernameAvailability(normalized).then((result) => {
        if (requestId !== checkRequestId.current) return;
        if (!result.valid) {
          setAvailability("invalid");
          return;
        }
        setAvailability(result.available ? "available" : "taken");
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [normalized]);

  const handleOpenGenerate = () => {
    setShowGenerated(true);
    if (suggestions.length === 0 && !isLoadingSuggestions) {
      void loadSuggestions(vibe);
    }
  };

  const handleVibeChange = (next: UsernameVibe) => {
    setVibe(next);
    void loadSuggestions(next);
  };

  const handleRefreshSuggestions = () => {
    void loadSuggestions(vibe);
  };

  const availabilityMessage = (() => {
    if (availability === "checking") return "Checking…";
    if (availability === "available") return "Available";
    if (availability === "taken") return "Taken";
    if (availability === "invalid" && normalized) return "Invalid format";
    return null;
  })();

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          Username
        </Label>
        <div
          className={cn(
            "flex h-11 w-full overflow-hidden rounded-lg border border-border bg-background shadow-xs",
            "dark:border-white/12 dark:bg-white/[0.03]",
          )}
        >
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(sanitizeUsernameInput(e.target.value))}
            onBlur={onBlur}
            disabled={disabled}
            maxLength={30}
            autoComplete="off"
            spellCheck={false}
            placeholder={inputPlaceholder}
            className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || isLoadingSuggestions}
            onClick={handleOpenGenerate}
            className="h-full shrink-0 gap-1.5 rounded-none border-l border-border px-3 text-xs font-medium sm:px-4 sm:text-sm dark:border-white/12"
          >
            {isLoadingSuggestions ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="size-3.5 shrink-0 opacity-90" aria-hidden />
            )}
            Generate
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-xs text-muted-foreground">{linkPath}</span>
          {availabilityMessage ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                availability === "available" && "bg-success-muted text-success-foreground",
                availability === "taken" && "bg-destructive/10 text-destructive",
                availability === "invalid" && "bg-destructive/10 text-destructive",
                availability === "checking" && "bg-muted text-muted-foreground",
              )}
            >
              {availabilityMessage}
            </span>
          ) : null}
        </div>
      </div>

      {showGenerated ? (
        <div className="space-y-3 border-t border-border pt-4 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            {USERNAME_VIBES.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={disabled || isLoadingSuggestions}
                onClick={() => handleVibeChange(option.id)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                  vibe === option.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/50 dark:border-white/10",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Generated options</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || isLoadingSuggestions}
              onClick={handleRefreshSuggestions}
              className="h-8 rounded-lg gap-1.5 px-2.5 text-xs text-muted-foreground"
            >
              {isLoadingSuggestions ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="size-3.5" aria-hidden />
              )}
              Refresh
            </Button>
          </div>
          {listedSuggestions.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-border dark:border-white/10">
              <ul className="divide-y divide-border dark:divide-white/10">
                {listedSuggestions.map((suggestion) => {
                  const isSelected = normalized === suggestion;
                  return (
                    <li key={suggestion}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(suggestion)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors cursor-pointer",
                          "hover:bg-muted/40 dark:hover:bg-white/3",
                          isSelected && "bg-muted/50 dark:bg-white/4",
                        )}
                      >
                        <span className="font-mono text-foreground">{suggestion}</span>
                        {isSelected ? (
                          <span className="shrink-0 text-xs text-muted-foreground">Selected</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isLoadingSuggestions ? "Loading…" : "No options right now."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
