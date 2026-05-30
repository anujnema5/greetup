"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Heart,
  ImageIcon,
  MapPin,
  Smile,
  Target,
} from "lucide-react";

import { NavSidebar, BottomNav } from "@/features/app-shell";
import { UserAvatarWithPresence } from "@/features/presence";
import { getRtkQueryErrorMessage } from "@/lib/api/rtk-query-error";

import { useGetPublicProfileQuery } from "../api/public-profile-api";
import { ProfileChipList } from "../components/profile-chip-list";
import { ProfileDetailSection } from "../components/profile-detail-section";
import { PublicProfileActions } from "../components/public-profile-actions";
import { PublicProfileAvatar } from "../components/public-profile-avatar";
import { usePublicProfileConnectionHandlers } from "../hooks/use-public-profile-connection-handlers";
import { getPublicProfileConnectionPanel } from "../lib/public-profile-connection";
import {
  publicProfileDisplayTitle,
  publicProfilePeerFromData,
  publicProfilePrimaryImage,
} from "../lib/public-profile-peer-display";
import {
  formatEducationLabel,
  formatGenderLabel,
  formatLocationLine,
} from "../utils/public-profile-display";

type Props = {
  username: string;
};

export function PublicProfilePage({ username }: Props) {
  const { data, isLoading, isError, error } = useGetPublicProfileQuery(username, {
    refetchOnMountOrArgChange: true,
  });

  const panel = data ? getPublicProfileConnectionPanel(data) : null;
  const connectionHandlers = usePublicProfileConnectionHandlers(data, panel);

  const displayTitle = data ? publicProfileDisplayTitle(data) : "";
  const primaryImage = data ? publicProfilePrimaryImage(data) : null;
  const peer = data ? publicProfilePeerFromData(data) : null;

  const workLines: string[] = [];
  if (data) {
    if (data.professions.length > 0) {
      workLines.push(...data.professions.map((p) => p.displayName));
    } else if (data.professionText?.trim()) {
      workLines.push(data.professionText.trim());
    }
  }

  const personalityChips =
    data?.personalityTags
      ?.split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/explore" />

      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-md md:px-8">
          <Link
            href="/explore"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to explore"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold leading-none text-foreground">
              Profile
            </h1>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">@{username}</p>
          </div>
        </header>

        <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col gap-5 px-4 py-6 md:max-w-xl md:px-8">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm">Loading profile…</p>
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm font-medium text-foreground">Profile unavailable</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {getRtkQueryErrorMessage(error) ||
                  "This profile doesn’t exist or you can’t view it."}
              </p>
              <Link
                href="/explore"
                className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
              >
                Back to Explore
              </Link>
            </div>
          )}

          {data && panel && peer && (
            <>
              <div className="flex flex-col items-center gap-3 text-center">
                <UserAvatarWithPresence
                  userId={data.userId}
                  borderClassName="border-background"
                  dotSize="lg"
                >
                  <PublicProfileAvatar imageUrl={primaryImage} title={displayTitle} />
                </UserAvatarWithPresence>
                <div>
                  <p className="text-lg font-semibold text-foreground">{displayTitle}</p>
                  <p className="text-sm text-muted-foreground">@{data.username}</p>
                </div>
                {(data.age != null || data.gender) && (
                  <p className="text-xs text-muted-foreground">
                    {[
                      data.age != null ? String(data.age) : null,
                      data.gender ? formatGenderLabel(data.gender) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {data.location && (
                  <p className="flex max-w-full items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin size={12} className="shrink-0" aria-hidden />
                    <span className="truncate">{formatLocationLine(data.location)}</span>
                  </p>
                )}
              </div>

              <PublicProfileActions
                panel={panel}
                peer={peer}
                isViewer={data.isViewer}
                connectionHandlers={connectionHandlers}
              />

              {data.purpose?.trim() && (
                <ProfileDetailSection title="On Greetup" icon={<Target className="h-4 w-4" />}>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                    {data.purpose.trim()}
                  </p>
                </ProfileDetailSection>
              )}

              {data.bio?.trim() && (
                <ProfileDetailSection title="About" icon={<BookOpen className="h-4 w-4" />}>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                    {data.bio.trim()}
                  </p>
                </ProfileDetailSection>
              )}

              {data.goals.length > 0 && (
                <ProfileDetailSection title="Goals" icon={<Target className="h-4 w-4" />}>
                  <ProfileChipList items={data.goals.map((g) => g.displayName)} />
                </ProfileDetailSection>
              )}

              {data.interests.length > 0 && (
                <ProfileDetailSection title="Interests" icon={<Heart className="h-4 w-4" />}>
                  <ProfileChipList items={data.interests.map((i) => i.displayName)} />
                </ProfileDetailSection>
              )}

              {(workLines.length > 0 || data.educationLevel?.trim()) && (
                <ProfileDetailSection title="Work & education" icon={<Briefcase className="h-4 w-4" />}>
                  <div className="flex flex-col gap-2 text-[13px] text-foreground">
                    {workLines.length > 0 ? <ProfileChipList items={workLines} /> : null}
                    {data.educationLevel?.trim() ? (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Education: </span>
                        {formatEducationLabel(data.educationLevel)}
                      </p>
                    ) : null}
                  </div>
                </ProfileDetailSection>
              )}

              {personalityChips.length > 0 && (
                <ProfileDetailSection title="Personality" icon={<Smile className="h-4 w-4" />}>
                  <ProfileChipList items={personalityChips} />
                </ProfileDetailSection>
              )}

              {(data.sessionGoal?.trim() || data.moods.length > 0) && (
                <ProfileDetailSection title="Right now" icon={<Smile className="h-4 w-4" />}>
                  <div className="flex flex-col gap-2">
                    {data.sessionGoal?.trim() ? (
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                        {data.sessionGoal.trim()}
                      </p>
                    ) : null}
                    {data.moods.length > 0 ? (
                      <ProfileChipList items={data.moods.map((m) => m.displayName)} />
                    ) : null}
                  </div>
                </ProfileDetailSection>
              )}

              {data.photos.length > 0 && (
                <ProfileDetailSection title="Photos" icon={<ImageIcon className="h-4 w-4" />}>
                  <div className="grid grid-cols-3 gap-2">
                    {data.photos.map((p) => (
                      <div
                        key={p.id}
                        className="aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </ProfileDetailSection>
              )}
            </>
          )}
        </div>
      </main>

      <BottomNav activePath="/explore" />
    </div>
  );
}
