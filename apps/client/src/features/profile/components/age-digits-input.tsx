"use client";

import { useState } from "react";
import type { FocusEventHandler } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AgeDigitsInputProps = {
  id: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
};

/**
 * Age entry without number spinners: plain text, max 2 digits, numeric keyboard on mobile.
 * Clears fully while editing; on blur empty/invalid reverts to last valid `value`.
 */
export function AgeDigitsInput({
  id,
  value,
  onChange,
  min = 18,
  max = 99,
  className,
  disabled,
  onBlur: onBlurProp,
  ...rest
}: AgeDigitsInputProps) {
  const safe = Number.isFinite(value) ? value : min;
  const canonicalText = String(safe);
  const [text, setText] = useState(() => canonicalText);
  const [syncedFrom, setSyncedFrom] = useState(() => ({ value, min }));

  if (syncedFrom.value !== value || syncedFrom.min !== min) {
    setSyncedFrom({ value, min });
    setText(canonicalText);
  }

  const applyTyping = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setText(digits);
    if (digits.length === 2) {
      const n = parseInt(digits, 10);
      if (!Number.isNaN(n)) {
        onChange(n);
      }
    }
  };

  const handleBlur: FocusEventHandler<HTMLInputElement> = (e) => {
    const digits = text.replace(/\D/g, "").slice(0, 2);
    if (digits === "") {
      setText(String(safe));
      // Keep RHF in sync: reverting the UI to `safe` must update the form value too ("" would coerce to 0 in Zod).
      onChange(safe);
      onBlurProp?.(e);
      return;
    }
    let n = parseInt(digits, 10);
    if (Number.isNaN(n)) {
      setText(String(safe));
      onChange(safe);
      onBlurProp?.(e);
      return;
    }
    setText(String(n));
    onChange(n);
    onBlurProp?.(e);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      maxLength={2}
      disabled={disabled}
      value={text}
      onChange={(e) => applyTyping(e.target.value)}
      onBlur={handleBlur}
      className={cn("rounded-xl tabular-nums", className)}
      {...rest}
    />
  );
}
