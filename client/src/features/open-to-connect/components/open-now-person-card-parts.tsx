"use client";

import type { ReactNode } from "react";
import { Briefcase, Heart, Tags } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type { OpenNowFeedItem } from "../types/open-to-connect.types";

type MetaChipProps = {
  icon: LucideIcon;
  children: ReactNode;
  tone?: "default" | "warm" | "accent";
  className?: string;
};

const chipToneClass = {
  default: "border-border/60 bg-muted/35 text-foreground/90",
  warm: "border-rose-500/20 bg-rose-500/8 text-rose-900 dark:text-rose-100",
  accent: "border-emerald-500/20 bg-emerald-500/8 text-emerald-900 dark:text-emerald-100",
} as const;

export function OpenNowMetaChip({
  icon: Icon,
  children,
  tone = "default",
  className,
}: MetaChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-snug",
        chipToneClass[tone],
        className,
      )}
    >
      <Icon className="size-3 shrink-0 opacity-70" aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}

type MetaProps = {
  person: OpenNowFeedItem;
  className?: string;
};

export function OpenNowPersonMeta({ person, className }: MetaProps) {
  const headline = person.headline?.trim();
  const lookingFor = person.lookingFor?.filter(Boolean) ?? [];
  const profession = person.profession?.trim();
  const sharedInterests = person.sharedInterests?.filter(Boolean) ?? [];

  const hasMeta = headline || lookingFor.length > 0 || profession || sharedInterests.length > 0;
  if (!hasMeta) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {headline ? (
        <p className="border-l-2 border-primary/35 pl-2.5 text-sm font-medium leading-snug text-foreground">
          {headline}
        </p>
      ) : null}

      {(lookingFor.length > 0 || profession || sharedInterests.length > 0) ? (
        <div className="flex flex-wrap gap-1.5">
          {lookingFor.map((label) => (
            <OpenNowMetaChip key={`lf-${label}`} icon={Heart} tone="warm">
              {label}
            </OpenNowMetaChip>
          ))}
          {profession ? (
            <OpenNowMetaChip icon={Briefcase} tone="default">
              {profession}
            </OpenNowMetaChip>
          ) : null}
          {sharedInterests.length > 0 ? (
            <OpenNowMetaChip icon={Tags} tone="accent">
              {sharedInterests.join(" · ")}
            </OpenNowMetaChip>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function openNowCompactHint(person: OpenNowFeedItem): string | null {
  const headline = person.headline?.trim();
  if (headline) return headline;

  const lookingFor = person.lookingFor?.filter(Boolean) ?? [];
  if (lookingFor.length > 0) return lookingFor.join(" · ");

  const profession = person.profession?.trim();
  if (profession) return profession;

  const shared = person.sharedInterests?.filter(Boolean) ?? [];
  if (shared.length > 0) return shared.join(" · ");

  const activity = person.activities[0];
  if (activity) {
    const detail = activity.detail?.trim();
    return detail ? `${activity.displayName} · ${detail}` : activity.displayName;
  }

  return null;
}
