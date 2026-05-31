"use client";

import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Check,
  Heart,
  ImageIcon,
  MapPin,
  Smile,
  Target,
} from "lucide-react";

import { UserAvatarWithPresence } from "@/features/presence";
import { getRtkQueryErrorMessage } from "@/lib/api/rtk-query-error";
import { cn } from "@/lib/utils";

import { useGetPublicProfileQuery } from "../api/public-profile-api";
import { PublicProfileContentSkeleton } from "./public-profile-content-skeleton";
import { ProfileChipList } from "./profile-chip-list";
import { ProfileDetailSection } from "./profile-detail-section";
import { PublicProfileActions } from "./public-profile-actions";
import { PublicProfileAvatar } from "./public-profile-avatar";
import { usePublicProfileConnectionHandlers } from "../hooks/use-public-profile-connection-handlers";
import { getPublicProfileConnectionPanel } from "../lib/public-profile-connection";
import {
  publicProfileDisplayTitle,
  publicProfilePeerFromData,
  publicProfilePrimaryImage,
} from "../lib/public-profile-peer-display";
import type { PublicProfileConnectionHandlers } from "../types/public-profile-actions.types";
import {
  formatEducationLabel,
  formatGenderLabel,
  formatLocationLine,
} from "../utils/public-profile-display";

type PublicProfileContentProps = {
  username: string;
  className?: string;
  /** Called after disconnect, withdraw, or reject succeeds. */
  onAfterConnectionRemoved?: () => void;
  unavailableBackHref?: string;
  unavailableBackLabel?: string;
  /** Side panel: skeleton follows split column width, not standalone page max-width. */
  embedded?: boolean;
};

export function PublicProfileContent({
  username,
  className,
  onAfterConnectionRemoved,
  unavailableBackHref = "/explore",
  unavailableBackLabel = "Back to Explore",
  embedded = false,
}: PublicProfileContentProps) {
  const { data, isLoading, isError, error } = useGetPublicProfileQuery(username, {
    refetchOnMountOrArgChange: true,
  });

  const panel = data ? getPublicProfileConnectionPanel(data) : null;
  const baseHandlers = usePublicProfileConnectionHandlers(data, panel);

  const connectionHandlers: PublicProfileConnectionHandlers = {
    ...baseHandlers,
    onDisconnect: async () => {
      const ok = await baseHandlers.onDisconnect();
      if (ok) onAfterConnectionRemoved?.();
      return ok;
    },
    onWithdraw: async () => {
      const ok = await baseHandlers.onWithdraw();
      if (ok) onAfterConnectionRemoved?.();
      return ok;
    },
  };

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

  if (isLoading) {
    if (embedded) return null;
    return <PublicProfileContentSkeleton className={className} compact={false} />;
  }

  if (isError) {
    return (
      <div className={cn("rounded-2xl border border-border bg-card p-6 text-center", className)}>
        <p className="text-sm font-medium text-foreground">Profile unavailable</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {getRtkQueryErrorMessage(error) ||
            "This profile doesn’t exist or you can’t view it."}
        </p>
        {unavailableBackHref ? (
          <Link
            href={unavailableBackHref}
            className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            {unavailableBackLabel}
          </Link>
        ) : null}
      </div>
    );
  }

  if (!data || !panel || !peer) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-5", className)}>
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
          {panel.kind === "accepted" && !data.isViewer ? (
            <p className="mt-1 inline-flex items-center justify-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="size-3" strokeWidth={2.5} aria-hidden />
              Connected
            </p>
          ) : null}
        </div>
        {(data.age != null || data.gender) && (
          <p className="text-xs text-muted-foreground">
            {[data.age != null ? String(data.age) : null, data.gender ? formatGenderLabel(data.gender) : null]
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
    </div>
  );
}
