"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Heart,
  ImageIcon,
  MapPin,
  Smile,
  Target,
  Users,
} from "lucide-react";

import { NavSidebar, BottomNav } from "@/features/app-shell";
import {
  useAcceptConnectionMutation,
  useRejectConnectionMutation,
  useWithdrawConnectionRequestMutation,
  useDisconnectConnectionMutation,
  useRequestConnectionMutation,
} from "@/features/connections/api/connections-api";
import { DisconnectConnectionDialog } from "@/features/connections/components/disconnect-connection-dialog";
import { WithdrawRequestDialog } from "@/features/connections/components/withdraw-request-dialog";
import { getRtkQueryErrorMessage } from "@/lib/api/rtk-query-error";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { publicProfileRtkCacheId } from "@/features/user-profile/api/public-profile-rtk-cache";
import { useGetPublicProfileQuery } from "../api/public-profile-api";
import { PublicProfileAvatar } from "../components/public-profile-avatar";
import { UserAvatarWithPresence } from "@/features/presence";
import { PublicProfileConnectionActions } from "../components/public-profile-connection-actions";
import { getPublicProfileConnectionPanel } from "../lib/public-profile-connection";
import {
  formatEducationLabel,
  formatGenderLabel,
  formatLocationLine,
} from "../utils/public-profile-display";
import { useState } from "react";

type Props = {
  username: string;
};

function ProfileDetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-primary">{icon}</span>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((label, index) => (
        <span
          key={`${label}-${index}`}
          className={cn(
            "rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium",
            "text-foreground/90 dark:border-primary/25 dark:bg-primary/10 dark:text-primary",
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function PublicProfilePage({ username }: Props) {
  const { data, isLoading, isError, error } = useGetPublicProfileQuery(username);
  const [requestConnection, { isLoading: isConnecting }] = useRequestConnectionMutation();
  const [acceptConnection, { isLoading: isAccepting }] = useAcceptConnectionMutation();
  const [rejectConnection, { isLoading: isRejecting }] = useRejectConnectionMutation();
  const [disconnectConnection, { isLoading: isDisconnecting }] = useDisconnectConnectionMutation();
  const [withdrawConnectionRequest, { isLoading: isWithdrawing }] =
    useWithdrawConnectionRequestMutation();
  const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);
  const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false);

  const panel = data ? getPublicProfileConnectionPanel(data) : null;

  const handleConnect = () => {
    if (!data) return;
    void requestConnection({
      targetUserId: data.userId,
      invalidatePublicProfileUsername: publicProfileRtkCacheId(data.username),
    })
      .unwrap()
      .then(() => toast.success("Connection request sent"))
      .catch((e: unknown) => toast.error(getRtkQueryErrorMessage(e)));
  };

  const handleDisconnect = () => {
    if (!panel || panel.kind !== "accepted" || !data) return;
    void disconnectConnection({
      connectionId: panel.connectionId,
      peerUsername: data.username,
    })
      .unwrap()
      .then(() => {
        setConfirmDisconnectOpen(false);
        toast.success("Connection removed");
      })
      .catch((e: unknown) => toast.error(getRtkQueryErrorMessage(e)));
  };

  const handleWithdraw = () => {
    if (!panel || panel.kind !== "pending_outgoing" || !data) return;
    void withdrawConnectionRequest({
      connectionId: panel.connectionId,
      peerUsername: data.username,
    })
      .unwrap()
      .then(() => {
        setConfirmWithdrawOpen(false);
        toast.success("Request withdrawn");
      })
      .catch((e: unknown) => toast.error(getRtkQueryErrorMessage(e)));
  };

  const handleAccept = () => {
    if (!panel || panel.kind !== "pending_incoming" || !data) return;
    void acceptConnection({
      connectionId: panel.connectionId,
      peerUsername: data.username,
    })
      .unwrap()
      .then(() => toast.success("Connection accepted"))
      .catch((e: unknown) => toast.error(getRtkQueryErrorMessage(e)));
  };

  const handleReject = () => {
    if (!panel || panel.kind !== "pending_incoming" || !data) return;
    void rejectConnection({
      connectionId: panel.connectionId,
      peerUsername: data.username,
    })
      .unwrap()
      .then(() => toast.success("Request rejected"))
      .catch((e: unknown) => toast.error(getRtkQueryErrorMessage(e)));
  };

  const primaryImage = data ? data.image ?? data.photos[0]?.url ?? null : null;
  const displayTitle = data ? data.displayName || data.name : "";

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
        <header className="sticky top-0 z-40 flex items-center gap-3 px-4 md:px-8 py-4 border-b border-border bg-background/95 backdrop-blur-md">
          <Link
            href="/explore"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Back to explore"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-foreground leading-none truncate">
              Profile
            </h1>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">@{username}</p>
          </div>
        </header>

        <div className="flex flex-col gap-5 px-4 md:px-8 py-6 max-w-lg md:max-w-xl mx-auto w-full min-w-0">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
              <p className="text-sm">Loading profile…</p>
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-foreground font-medium">Profile unavailable</p>
              <p className="text-xs text-muted-foreground mt-2">
                {getRtkQueryErrorMessage(error) ||
                  "This profile doesn’t exist or you can’t view it."}
              </p>
              <Link
                href="/explore"
                className="inline-flex mt-4 text-sm font-semibold text-primary hover:underline"
              >
                Back to Explore
              </Link>
            </div>
          )}

          {data && (
            <>
              <div className="flex flex-col items-center text-center gap-3">
                <UserAvatarWithPresence userId={data.userId} borderClassName="border-background" dotSize="lg">
                  <PublicProfileAvatar imageUrl={primaryImage} title={displayTitle} />
                </UserAvatarWithPresence>
                <div>
                  <p className="text-lg font-semibold text-foreground">{displayTitle}</p>
                  <p className="text-sm text-muted-foreground">@{data.username}</p>
                </div>
                {(data.age != null || data.gender) && (
                  <p className="text-xs text-muted-foreground">
                    {[data.age != null ? String(data.age) : null, data.gender ? formatGenderLabel(data.gender) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {data.location && (
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 max-w-full">
                    <MapPin size={12} className="shrink-0" aria-hidden />
                    <span className="truncate">{formatLocationLine(data.location)}</span>
                  </p>
                )}
              </div>

              {panel && panel.kind !== "none" && (
                <PublicProfileConnectionActions
                  panel={panel}
                  isSubmittingConnect={isConnecting}
                  isSubmittingDisconnect={isDisconnecting}
                  isSubmittingWithdraw={isWithdrawing}
                  isSubmittingAccept={isAccepting}
                  isSubmittingReject={isRejecting}
                  onConnect={handleConnect}
                  onDisconnect={() => setConfirmDisconnectOpen(true)}
                  onWithdraw={() => setConfirmWithdrawOpen(true)}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              )}
              {panel?.kind === "accepted" && data ? (
                <DisconnectConnectionDialog
                  open={confirmDisconnectOpen}
                  onOpenChange={setConfirmDisconnectOpen}
                  onConfirm={handleDisconnect}
                  isSubmitting={isDisconnecting}
                  peer={{
                    name: displayTitle,
                    image: primaryImage,
                    username: data.username,
                  }}
                />
              ) : null}
              {panel?.kind === "pending_outgoing" && data ? (
                <WithdrawRequestDialog
                  open={confirmWithdrawOpen}
                  onOpenChange={setConfirmWithdrawOpen}
                  onConfirm={handleWithdraw}
                  isSubmitting={isWithdrawing}
                  peer={{
                    name: displayTitle,
                    image: primaryImage,
                    username: data.username,
                  }}
                />
              ) : null}

              {data.purpose?.trim() && (
                <ProfileDetailSection title="On Greetup" icon={<Target className="h-4 w-4" />}>
                  <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                    {data.purpose.trim()}
                  </p>
                </ProfileDetailSection>
              )}

              {data.bio?.trim() && (
                <ProfileDetailSection title="About" icon={<BookOpen className="h-4 w-4" />}>
                  <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                    {data.bio.trim()}
                  </p>
                </ProfileDetailSection>
              )}

              {data.goals.length > 0 && (
                <ProfileDetailSection title="Goals" icon={<Target className="h-4 w-4" />}>
                  <ChipList items={data.goals.map((g) => g.displayName)} />
                </ProfileDetailSection>
              )}

              {data.interests.length > 0 && (
                <ProfileDetailSection title="Interests" icon={<Heart className="h-4 w-4" />}>
                  <ChipList items={data.interests.map((i) => i.displayName)} />
                </ProfileDetailSection>
              )}

              {(workLines.length > 0 || data.educationLevel?.trim()) && (
                <ProfileDetailSection title="Work & education" icon={<Briefcase className="h-4 w-4" />}>
                  <div className="flex flex-col gap-2 text-[13px] text-foreground">
                    {workLines.length > 0 ? <ChipList items={workLines} /> : null}
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
                  <ChipList items={personalityChips} />
                </ProfileDetailSection>
              )}

              {(data.sessionGoal?.trim() || data.moods.length > 0) && (
                <ProfileDetailSection title="Right now" icon={<Smile className="h-4 w-4" />}>
                  <div className="flex flex-col gap-2">
                    {data.sessionGoal?.trim() ? (
                      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                        {data.sessionGoal.trim()}
                      </p>
                    ) : null}
                    {data.moods.length > 0 ? (
                      <ChipList items={data.moods.map((m) => m.displayName)} />
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
                        className="aspect-square rounded-xl overflow-hidden bg-muted border border-border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </ProfileDetailSection>
              )}

              {data.isViewer && (
                <p className="text-center text-xs text-muted-foreground">
                  This is how your profile looks to others.
                </p>
              )}
            </>
          )}
        </div>
      </main>

      <BottomNav activePath="/explore" />
    </div>
  );
}
