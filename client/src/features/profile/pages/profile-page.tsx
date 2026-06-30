"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  Briefcase,
  Camera,
  FileText,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  SlidersHorizontal,
  Star,
  Target,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/fetch-client";

import { NavSidebar, BottomNav, PageHeader } from "@/features/app-shell";
import {
  useMyProfile,
  useProfileSetupSteps,
  useSaveProfileSetup,
} from "@/features/profile-setup/api";
import { getProfileImageUrl } from "@/lib/ui/profile-image";

import { ProfileConnectionsSection } from "@/features/connections";
import { useProfileInsights, PROFILE_INSIGHTS_RECENT_MATCHES_LIMIT } from "../api/profile-insights.queries";
import { ProfileCompletionCard } from "../components/profile-completion-card";
import { ProfileEditModals } from "../components/profile-edit-modals";
import { ProfilePhotoDialog } from "../components/profile-photo-dialog";
import { ProfileRecentMatchesSection } from "../components/profile-recent-matches-section";
import { ProfileSectionRow } from "../components/profile-section-row";
import { RoomInviteSettingsModal } from "../components/room-invite-settings-modal";
import { OpenToConnectSettingsToggle } from "@/features/open-to-connect";
import type { EditableProfile, ProfileEditSectionId } from "../types/profile-editor.types";
import {
  buildProfileSavePayload,
  validateProfileSection,
} from "../utils/build-profile-save-payload";
import { mapMyProfileToEditable } from "../utils/map-my-profile";
import { buildProfileEditorCatalog } from "../utils/profile-editor-catalog";
import { labelsFromIds, professionLabel, apiErrorMessage } from "../utils/profile-utils";

export function ProfilePage() {
  const profileQuery = useMyProfile();
  const insightsQuery = useProfileInsights({ recentLimit: PROFILE_INSIGHTS_RECENT_MATCHES_LIMIT });
  const stepsQuery = useProfileSetupSteps();
  const { mutateAsync: saveProfileSetup, isPending: isSaving } = useSaveProfileSetup();

  const [activeSection, setActiveSection] = useState<ProfileEditSectionId | null>(null);
  const [roomInviteOpen, setRoomInviteOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  const rawProfile = profileQuery.data;
  const profile = useMemo(
    () => (rawProfile ? mapMyProfileToEditable(rawProfile) : null),
    [rawProfile]
  );

  const catalog = useMemo(() => {
    const steps = stepsQuery.data?.steps ?? [];
    return buildProfileEditorCatalog(steps);
  }, [stepsQuery.data]);

  const completionPct = rawProfile?.profileCompletion;
  const completionRounded =
    completionPct != null && Number.isFinite(completionPct)
      ? Math.round(Math.min(100, Math.max(0, completionPct)))
      : null;
  const isProfileComplete = rawProfile?.isOnboarded === true || (completionRounded ?? 0) >= 80;

  const recentMatches = insightsQuery.data?.recentMatches ?? [];
  const insightsLoading = insightsQuery.isLoading || insightsQuery.isFetching;

  const handleSaveSection = useCallback(
    async (section: ProfileEditSectionId, draft: EditableProfile) => {
      const msg = validateProfileSection(section, draft);
      if (msg) {
        toast.error(msg);
        throw new Error(msg);
      }
      try {
        await saveProfileSetup(buildProfileSavePayload(section, draft));
        toast.success("Profile updated");
      } catch (e) {
        toast.error(apiErrorMessage(e));
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

  const roomInviteSummary = useMemo(() => {
    const ri = rawProfile?.roomInvite;
    if (!ri) return "Everyone you know can invite you";
    if (ri.policy === "all_connections") return "Everyone you know can invite you";
    if (ri.allowlistedUserIds.length === 0) return "Only chosen people — none picked yet";
    return `${ri.allowlistedUserIds.length} ${ri.allowlistedUserIds.length === 1 ? "person" : "people"} allowed`;
  }, [rawProfile?.roomInvite]);

  const prefsSummary = useMemo(() => {
    if (!profile) return "";
    const bits = [
      `Ages ${profile.ageRange.min}–${profile.ageRange.max}`,
      profile.distancePreference,
      profile.preferredGender === "any" ? "Open to everyone" : `Into ${profile.preferredGender}`,
    ];
    return bits.join(" · ");
  }, [profile]);

  const promptsSummary = useMemo(() => {
    if (!profile) return "Add answers to show on your profile";
    const count = Object.values(profile.promptAnswers).filter((a) => a.trim().length > 0).length;
    if (count === 0) return "Add answers to show on your profile";
    return `${count} answer${count === 1 ? "" : "s"} added`;
  }, [profile]);

  const loading = profileQuery.isLoading || stepsQuery.isLoading;

  const shell = (body: ReactNode) => (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/profile" />
      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <PageHeader title="Profile" subtitle="Edit one section at a time." />
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          {body}
        </div>
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
    if (profileQuery.error instanceof ApiError && profileQuery.error.status === 404) {
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
        <p className="text-sm text-muted-foreground">{apiErrorMessage(profileQuery.error)}</p>
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
        <PageHeader
          title="Profile"
          subtitle="Edit one section at a time."
          actions={
            <button
              type="button"
              onClick={() => setActiveSection("basics")}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
            >
              Edit
            </button>
          }
        />

        <div className="flex flex-col gap-5 px-4 md:px-8 py-5">
          <ProfileCompletionCard
            percent={completionPct ?? undefined}
            isOnboarded={rawProfile?.isOnboarded}
            onContinueEditing={() => setActiveSection("basics")}
          />

          <div
            className="relative overflow-hidden rounded-3xl border border-border bg-card bg-profile-hero-surface"
          >
            <div className="flex items-start gap-4 p-5">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setPhotoDialogOpen(true)}
                  className="group relative h-24 w-24 overflow-hidden rounded-2xl ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer md:h-28 md:w-28"
                  aria-label="Change profile photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getProfileImageUrl(profile.photos[0]?.url)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    Edit
                  </span>
                </button>
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-emerald-500 dark:bg-emerald-400 pointer-events-none" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-h-24 flex-col md:min-h-28">
                  <h2 className="text-lg font-bold text-foreground tracking-tight">
                    {profile.displayName}
                    <span className="text-muted-foreground font-semibold">, {profile.age}</span>
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{headline}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {profile.country.name}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {profile.bio}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center gap-0.5 rounded-2xl border border-primary/25 bg-primary/10 px-3 py-2 dark:border-primary/30 dark:bg-primary/15">
                <Star size={14} className="text-primary" />
                <span className="text-lg font-black tabular-nums text-primary">
                  {completionRounded != null ? completionRounded : "—"}
                </span>
                <span className="text-[9px] text-muted-foreground font-medium text-center leading-tight">
                  {isProfileComplete ? "DONE" : "PROFILE"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
              Profile details
            </p>
            <ProfileSectionRow
              icon={<Camera className="h-4 w-4" />}
              label="Profile photo"
              summary={
                rawProfile?.photos?.length
                  ? `${rawProfile.photos.length} photo${rawProfile.photos.length === 1 ? "" : "s"} · tap to change`
                  : "Add a profile photo"
              }
              onClick={() => setPhotoDialogOpen(true)}
            />
            <ProfileSectionRow
              icon={<User className="h-4 w-4" />}
              label="Basics"
              summary={`${profile.displayName}, ${profile.age} · ${profile.gender} · ${profile.country.name}`}
              onClick={() => setActiveSection("basics")}
            />
            <ProfileSectionRow
              icon={<Target className="h-4 w-4" />}
              label="Goals on Greetup"
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
              icon={<UserPlus className="h-4 w-4" />}
              label="Who can invite you to a room"
              summary={roomInviteSummary}
              onClick={() => setRoomInviteOpen(true)}
            />
            <OpenToConnectSettingsToggle />
            <ProfileSectionRow
              icon={<FileText className="h-4 w-4" />}
              label="Bio"
              summary={
                profile.bio.length > 72 ? `${profile.bio.slice(0, 72)}…` : profile.bio || "Add a bio"
              }
              onClick={() => setActiveSection("bio")}
            />
            <ProfileSectionRow
              icon={<MessageSquare className="h-4 w-4" />}
              label="About me"
              summary={promptsSummary}
              onClick={() => setActiveSection("prompts")}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <ProfileConnectionsSection showSeeAllLink />
          </div>

          <ProfileRecentMatchesSection matches={recentMatches} isLoading={insightsLoading} />
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

      <RoomInviteSettingsModal
        open={roomInviteOpen}
        onOpenChange={setRoomInviteOpen}
        initial={
          rawProfile?.roomInvite ?? {
            policy: "all_connections" as const,
            allowlistedUserIds: [],
          }
        }
      />

      {rawProfile ? (
        <ProfilePhotoDialog
          open={photoDialogOpen}
          onOpenChange={setPhotoDialogOpen}
          existingPhotos={rawProfile.photos}
          onUploaded={() => {
            void profileQuery.refetch();
          }}
        />
      ) : null}
    </div>
  );
}
