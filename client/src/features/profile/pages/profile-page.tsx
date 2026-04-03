"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  Briefcase,
  FileText,
  Heart,
  Loader2,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  User,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { NavSidebar, BottomNav } from "@/features/app-shell";
import {
  useGetMyProfileQuery,
  useGetProfileSetupStepsQuery,
  useSaveProfileSetupMutation,
} from "@/features/profile-setup/components/profile-setup-api";
import { cn } from "@/lib/utils";

import { ProfileConnectionsSection } from "@/features/connections";
import { ProfileCompletionCard } from "../components/profile-completion-card";
import { ProfileEditModals } from "../components/profile-edit-modals";
import { ProfileSectionRow } from "../components/profile-section-row";
import { RECENT_MATCHES, STATS, ACTIVITY } from "../constants/mock-data";
import type { EditableProfile, ProfileEditSectionId } from "../types/profile-editor.types";
import {
  buildProfileSavePayload,
  validateProfileSection,
} from "../utils/build-profile-save-payload";
import { mapMyProfileToEditable } from "../utils/map-my-profile";
import { buildProfileEditorCatalog } from "../utils/profile-editor-catalog";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function labelsFromIds(ids: string[], catalog: Array<{ id: string; label: string }>) {
  const m = new Map(catalog.map((x) => [x.id, x.label]));
  return ids.map((id) => m.get(id)).filter(Boolean).join(", ");
}

function professionLabel(id: string | null, catalog: Array<{ id: string; label: string }>) {
  if (!id) return "Not set";
  return catalog.find((p) => p.id === id)?.label ?? "—";
}

function rtkErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const d = (error as FetchBaseQueryError).data;
    if (d && typeof d === "object" && "message" in d && typeof (d as { message?: string }).message === "string") {
      return (d as { message: string }).message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong";
}

export function ProfilePage() {
  const profileQuery = useGetMyProfileQuery();
  const stepsQuery = useGetProfileSetupStepsQuery();
  const [saveProfileSetup, { isLoading: isSaving }] = useSaveProfileSetupMutation();

  const [activeSection, setActiveSection] = useState<ProfileEditSectionId | null>(null);

  const rawProfile = profileQuery.data?.data;
  const profile = useMemo(
    () => (rawProfile ? mapMyProfileToEditable(rawProfile) : null),
    [rawProfile]
  );

  const catalog = useMemo(() => {
    const steps = stepsQuery.data?.data?.steps ?? [];
    return buildProfileEditorCatalog(steps);
  }, [stepsQuery.data]);

  const completionPct = rawProfile?.profileCompletion;
  const completionRounded =
    completionPct != null && Number.isFinite(completionPct)
      ? Math.round(Math.min(100, Math.max(0, completionPct)))
      : null;
  const isProfileComplete = rawProfile?.isOnboarded === true || (completionRounded ?? 0) >= 80;

  const stats = useMemo(() => {
    const rows = STATS.map((s) => ({ ...s }));
    if (completionRounded != null) {
      const i = rows.findIndex((r) => r.label === "Vibe Score");
      if (i >= 0) {
        rows[i] = { label: "Complete", value: `${completionRounded}%` };
      }
    }
    return rows;
  }, [completionRounded]);

  const handleSaveSection = useCallback(
    async (section: ProfileEditSectionId, draft: EditableProfile) => {
      const msg = validateProfileSection(section, draft);
      if (msg) {
        toast.error(msg);
        throw new Error(msg);
      }
      try {
        await saveProfileSetup(buildProfileSavePayload(section, draft)).unwrap();
        toast.success("Profile updated");
      } catch (e) {
        toast.error(rtkErrorMessage(e));
        throw e;
      }
    },
    [saveProfileSetup]
  );

  const professionLine = profile ? professionLabel(profile.professionId, catalog.professions) : "";
  const headline = profile
    ? profile.professionId
      ? `${professionLine} · ${profile.country.name}`
      : `${profile.country.name}`
    : "";

  const prefsSummary = useMemo(() => {
    if (!profile) return "";
    const bits = [
      `Ages ${profile.ageRange.min}–${profile.ageRange.max}`,
      profile.distancePreference,
      profile.preferredGender === "any" ? "Open to everyone" : `Into ${profile.preferredGender}`,
    ];
    return bits.join(" · ");
  }, [profile]);

  const interestLabelById = useMemo(
    () => new Map(catalog.interests.map((i) => [i.id, i.label])),
    [catalog.interests]
  );

  const loading = profileQuery.isLoading || stepsQuery.isLoading;

  const shell = (body: ReactNode) => (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/profile" />
      <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 text-center pb-16 md:pb-0">
        {body}
      </main>
      <BottomNav activePath="/profile" />
    </div>
  );

  if (loading) {
    return shell(
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
    );
  }

  if (profileQuery.isError) {
    const status = (profileQuery.error as FetchBaseQueryError | undefined)?.status;
    if (status === 404) {
      return shell(
        <div className="flex max-w-sm flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            We couldn’t find a profile yet. Complete setup first, then you can edit everything here.
          </p>
          <Link
            href="/profile-setup"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to profile setup
          </Link>
        </div>
      );
    }
    return shell(
      <div className="flex max-w-sm flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">{rtkErrorMessage(profileQuery.error)}</p>
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => profileQuery.refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (stepsQuery.isError) {
    return shell(
      <div className="flex max-w-sm flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">Couldn’t load profile options.</p>
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => stepsQuery.refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!profile) {
    return shell(
      <p className="text-sm text-muted-foreground">No profile data returned.</p>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/profile" />

      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-background/95 backdrop-blur-md shadow-sm">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground leading-none">Profile</h1>
            <p className="text-[11px] text-muted-foreground mt-1">Edit one section at a time.</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveSection("basics")}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200 cursor-pointer"
          >
            Edit
          </button>
        </header>

        <div className="flex flex-col gap-5 px-4 md:px-8 py-5">
          <ProfileCompletionCard
            percent={completionPct ?? undefined}
            isOnboarded={rawProfile?.isOnboarded}
            onContinueEditing={() => setActiveSection("basics")}
          />

          <div
            className="relative overflow-hidden rounded-3xl border border-border bg-card"
            style={{
              background: `
                radial-gradient(ellipse 70% 50% at 50% 0%, var(--surface-hero-glow) 0%, transparent 72%),
                var(--surface-hero-base)
              `,
            }}
          >
            <div className="flex items-start gap-4 p-5">
              <div className="relative shrink-0">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center text-lg font-bold text-primary-foreground overflow-hidden bg-gradient-to-br from-primary to-primary/85 shadow-md shadow-primary/25 dark:shadow-primary/30"
                >
                  {profile.photos[0]?.url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={profile.photos[0].url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials(profile.displayName)
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500 dark:bg-emerald-400" />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-foreground tracking-tight">
                  {profile.displayName}
                  <span className="text-muted-foreground font-semibold">, {profile.age}</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{headline}</p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {profile.country.name}
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center gap-0.5 rounded-2xl border border-primary/25 bg-primary/10 px-3 py-2 dark:border-primary/30 dark:bg-primary/15">
                <Sparkles size={14} className="text-primary" />
                <span className="text-lg font-black tabular-nums text-primary">
                  {completionRounded != null ? completionRounded : "—"}
                </span>
                <span className="text-[9px] text-muted-foreground font-medium text-center leading-tight">
                  {isProfileComplete ? "DONE" : "PROFILE"}
                </span>
              </div>
            </div>

            <p className="px-5 text-sm text-muted-foreground leading-relaxed line-clamp-4">
              {profile.bio}
            </p>
            <div className="flex flex-wrap gap-1.5 px-5 pb-5 pt-3">
              {profile.interestIds.map((id) => {
                const label = interestLabelById.get(id);
                if (!label) return null;
                return (
                  <span
                    key={id}
                    className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-foreground/90 dark:border-primary/25 dark:bg-primary/10 dark:text-primary"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
              Profile details
            </p>
            <ProfileSectionRow
              icon={<User className="h-4 w-4" />}
              label="Basics"
              summary={`${profile.displayName}, ${profile.age} · ${profile.gender} · ${profile.country.name}`}
              onClick={() => setActiveSection("basics")}
            />
            <ProfileSectionRow
              icon={<Target className="h-4 w-4" />}
              label="Goals on Circlo"
              summary={
                labelsFromIds(profile.goalIds, catalog.goals) || "Add what you’re here for"
              }
              onClick={() => setActiveSection("goals")}
            />
            <ProfileSectionRow
              icon={<Heart className="h-4 w-4" />}
              label="Interests"
              summary={
                labelsFromIds(profile.interestIds, catalog.interests) || "Add interests"
              }
              onClick={() => setActiveSection("interests")}
            />
            <ProfileSectionRow
              icon={<Briefcase className="h-4 w-4" />}
              label="Work"
              summary={professionLine}
              onClick={() => setActiveSection("work")}
            />
            <ProfileSectionRow
              icon={<SlidersHorizontal className="h-4 w-4" />}
              label="Matching preferences"
              summary={prefsSummary}
              onClick={() => setActiveSection("preferences")}
            />
            <ProfileSectionRow
              icon={<FileText className="h-4 w-4" />}
              label="Bio"
              summary={
                profile.bio.length > 72 ? `${profile.bio.slice(0, 72)}…` : profile.bio || "Add a bio"
              }
              onClick={() => setActiveSection("bio")}
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            {stats.map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card py-3 px-2"
              >
                <span className="text-xl font-black text-foreground">{value}</span>
                <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <ProfileConnectionsSection showSeeAllLink />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Recent Matches</h3>
              <button type="button" className="text-xs text-primary hover:underline cursor-pointer">
                See all
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {RECENT_MATCHES.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors duration-150"
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full bg-linear-to-br flex items-center justify-center text-sm font-bold text-white shrink-0",
                      m.grad
                    )}
                  >
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.tagline}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Sparkles size={11} className="text-primary" />
                    <span className="text-xs font-semibold text-primary">{m.score}%</span>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors duration-150 cursor-pointer"
                  >
                    <Video size={11} />
                    Call
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Star size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Activity</h3>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              {ACTIVITY.map(({ action, time }) => (
                <div key={action} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-muted-foreground min-w-0">
                    <Users size={13} className="text-primary shrink-0" />
                    <span className="truncate">{action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <BottomNav activePath="/profile" />

      <ProfileEditModals
        active={activeSection}
        onClose={() => setActiveSection(null)}
        profile={profile}
        catalog={catalog}
        onSaveSection={handleSaveSection}
        isSaving={isSaving}
      />
    </div>
  );
}
