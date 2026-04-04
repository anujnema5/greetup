"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryDropdown } from "@/components/ui/country-dropdown";
import { cn } from "@/lib/utils";

import type { ProfileEditorCatalog } from "../utils/profile-editor-catalog";
import type { EditableProfile, ProfileEditSectionId } from "../types/profile-editor.types";
import { AgeDigitsInput } from "./age-digits-input";
import { ProfileEditShell } from "./profile-edit-shell";

type ProfileEditModalsProps = {
  active: ProfileEditSectionId | null;
  onClose: () => void;
  profile: EditableProfile;
  catalog: ProfileEditorCatalog;
  onSaveSection: (section: ProfileEditSectionId, draft: EditableProfile) => Promise<void>;
  isSaving: boolean;
};

function toggleId(ids: string[], id: string, max?: number): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  if (max !== undefined && ids.length >= max) return ids;
  return [...ids, id];
}

function Chip({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors cursor-pointer",
        selected
          ? "border-primary bg-primary/12 text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted/80"
      )}
    >
      {children}
    </button>
  );
}

export function ProfileEditModals({
  active,
  onClose,
  profile,
  catalog,
  onSaveSection,
  isSaving,
}: ProfileEditModalsProps) {
  const [draft, setDraft] = useState<EditableProfile | null>(null);

  const open = active !== null;
  const section = active;

  useEffect(() => {
    if (section) setDraft({ ...profile });
  }, [section, profile]);

  const d = draft ?? profile;

  const handleSave = async () => {
    if (!section) return;
    try {
      await onSaveSection(section, draft ?? profile);
      onClose();
    } catch {
      /* toast handled in parent */
    }
  };

  const patchDraft = (patch: Partial<EditableProfile>) => {
    setDraft((prev) => ({ ...(prev ?? profile), ...patch }));
  };

  const footer = (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={isSaving}
        className={cn(
          "flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors",
          "bg-card text-foreground hover:bg-muted hover:text-foreground",
          "disabled:pointer-events-none disabled:opacity-50"
        )}
        onClick={onClose}
      >
        Cancel
      </button>
      <Button
        type="button"
        className="flex-1 rounded-xl gap-2"
        onClick={() => void handleSave()}
        disabled={isSaving}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Save
      </Button>
    </div>
  );

  return (
    <>
      <ProfileEditShell
        open={open && section === "basics"}
        onOpenChange={(o) => !o && onClose()}
        title="Basics"
        description="Name, age, and where you’re based — shown on your card."
        footer={section === "basics" ? footer : undefined}
      >
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="pe-name">Display name</Label>
            <Input
              id="pe-name"
              value={d.displayName}
              onChange={(e) => patchDraft({ displayName: e.target.value })}
              className="rounded-xl"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pe-age">Age</Label>
            <AgeDigitsInput
              id="pe-age"
              min={18}
              max={99}
              value={d.age}
              onChange={(n) => patchDraft({ age: n })}
            />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={d.gender}
              onValueChange={(v) =>
                patchDraft({ gender: v as EditableProfile["gender"] })
              }
            >
              <SelectTrigger className="rounded-xl w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <CountryDropdown
              key={d.country.code}
              defaultValue={d.country.code}
              onChange={(c) =>
                patchDraft({
                  country: { code: c.alpha3, name: c.name },
                })
              }
            />
          </div>
        </div>
      </ProfileEditShell>

      <ProfileEditShell
        open={open && section === "goals"}
        onOpenChange={(o) => !o && onClose()}
        title="Goals on Circlo"
        description="What you want here — helps us match you with the right people."
        footer={section === "goals" ? footer : undefined}
      >
        {catalog.goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Goal options could not be loaded.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {catalog.goals.map((g) => {
              const selected = d.goalIds.includes(g.id);
              return (
                <Chip
                  key={g.id}
                  selected={selected}
                  onClick={() =>
                    patchDraft({
                      goalIds: toggleId(d.goalIds, g.id, catalog.goalMax),
                    })
                  }
                >
                  {g.emoji ? <span className="mr-1">{g.emoji}</span> : null}
                  {g.label}
                </Chip>
              );
            })}
          </div>
        )}
      </ProfileEditShell>

      <ProfileEditShell
        open={open && section === "interests"}
        onOpenChange={(o) => !o && onClose()}
        title="Interests"
        description="Pick a few things you actually like talking about."
        footer={section === "interests" ? footer : undefined}
      >
        {catalog.interests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Interest options could not be loaded.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {catalog.interests.map((i) => {
              const selected = d.interestIds.includes(i.id);
              return (
                <Chip
                  key={i.id}
                  selected={selected}
                  onClick={() =>
                    patchDraft({
                      interestIds: toggleId(d.interestIds, i.id, catalog.interestMax),
                    })
                  }
                >
                  {i.label}
                </Chip>
              );
            })}
          </div>
        )}
      </ProfileEditShell>

      <ProfileEditShell
        open={open && section === "work"}
        onOpenChange={(o) => !o && onClose()}
        title="Work"
        description="Your main role — optional, but it adds context."
        footer={section === "work" ? footer : undefined}
      >
        <div className="space-y-2">
          <Label>Profession</Label>
          <Select
            value={d.professionId ?? "none"}
            onValueChange={(v) => patchDraft({ professionId: v === "none" ? null : v })}
          >
            <SelectTrigger className="rounded-xl w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Prefer not to say</SelectItem>
              {catalog.professions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ProfileEditShell>

      <ProfileEditShell
        open={open && section === "preferences"}
        onOpenChange={(o) => !o && onClose()}
        title="Matching preferences"
        description="Who you’d like to meet and how far you’re open to connecting."
        footer={section === "preferences" ? footer : undefined}
      >
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>Interested in</Label>
            <Select
              value={d.preferredGender}
              onValueChange={(v) =>
                patchDraft({ preferredGender: v as EditableProfile["preferredGender"] })
              }
            >
              <SelectTrigger className="rounded-xl w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Everyone</SelectItem>
                <SelectItem value="male">Men</SelectItem>
                <SelectItem value="female">Women</SelectItem>
                <SelectItem value="others">Non-binary &amp; more</SelectItem>
                <SelectItem value="same">Same as me</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Distance</Label>
            <Select
              value={d.distancePreference}
              onValueChange={(v) =>
                patchDraft({ distancePreference: v as EditableProfile["distancePreference"] })
              }
            >
              <SelectTrigger className="rounded-xl w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nearby">Nearby</SelectItem>
                <SelectItem value="same city">Same city</SelectItem>
                <SelectItem value="same country">Same country</SelectItem>
                <SelectItem value="random">Surprise me</SelectItem>
                <SelectItem value="global">Global</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pe-min">Min age</Label>
              <AgeDigitsInput
                id="pe-min"
                min={18}
                max={99}
                value={d.ageRange.min}
                onChange={(n) =>
                  patchDraft({
                    ageRange: {
                      ...d.ageRange,
                      min: Math.min(d.ageRange.max, n),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-max">Max age</Label>
              <AgeDigitsInput
                id="pe-max"
                min={18}
                max={99}
                value={d.ageRange.max}
                onChange={(n) =>
                  patchDraft({
                    ageRange: {
                      ...d.ageRange,
                      max: Math.max(d.ageRange.min, n),
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      </ProfileEditShell>

      <ProfileEditShell
        open={open && section === "bio"}
        onOpenChange={(o) => !o && onClose()}
        title="Bio"
        description="A short line about you — shown on your profile."
        footer={section === "bio" ? footer : undefined}
      >
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="pe-bio">Bio</Label>
            <Textarea
              id="pe-bio"
              value={d.bio}
              onChange={(e) => patchDraft({ bio: e.target.value })}
              className="min-h-[120px] rounded-xl resize-none"
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground text-right">{d.bio.length}/500</p>
          </div>
        </div>
      </ProfileEditShell>
    </>
  );
}
