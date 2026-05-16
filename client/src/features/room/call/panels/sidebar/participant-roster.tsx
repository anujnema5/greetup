"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { RemotePeer } from "@/features/rtc/types/mediasoup-room.types";
import {
  ParticipantKickMenuButton,
  ParticipantRemoveConfirmDialog,
} from "@/features/room/call/components/participant-kick-actions";
import type {
  OnRemoveCircleParticipant,
  ParticipantRemoveTarget,
} from "@/features/room/types/call/participant-remove.types";
import { getProfileImageUrl } from "@/lib/ui/profile-image";

type RosterRow = {
  userId: string;
  label: string;
  imageUrl?: string | null;
  isSelf: boolean;
};

function initialsFromLabel(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function RosterAvatar({
  imageUrl,
  initials,
}: {
  imageUrl?: string | null;
  initials: string;
}) {
  return (
    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
      {imageUrl?.trim() ? (
        <Image
          src={getProfileImageUrl(imageUrl)}
          alt=""
          fill
          className="object-cover"
          sizes="32px"
          unoptimized
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-foreground">
          {initials || "?"}
        </span>
      )}
    </div>
  );
}

type CircleParticipantRosterProps = {
  myName: string;
  myAvatarUrl?: string | null;
  currentUserId: string | null;
  remotePeers: Record<string, RemotePeer>;
  isHost: boolean;
  kickingUserId: string | null;
  onKickParticipant?: OnRemoveCircleParticipant;
};

export function CircleParticipantRoster({
  myName,
  myAvatarUrl,
  currentUserId,
  remotePeers,
  isHost,
  kickingUserId,
  onKickParticipant,
}: CircleParticipantRosterProps) {
  const [confirmTarget, setConfirmTarget] = useState<ParticipantRemoveTarget | null>(null);

  const rows = useMemo((): RosterRow[] => {
    const selfLabel = myName.trim() || "You";
    const list: RosterRow[] = [
      {
        userId: currentUserId ?? "self",
        label: selfLabel,
        imageUrl: myAvatarUrl,
        isSelf: true,
      },
    ];
    for (const id of Object.keys(remotePeers).sort()) {
      const peer = remotePeers[id]!;
      list.push({
        userId: id,
        label: peer.displayName?.trim() || `Guest ${id.slice(0, 6)}`,
        imageUrl: peer.image,
        isSelf: false,
      });
    }
    return list;
  }, [currentUserId, myAvatarUrl, myName, remotePeers]);

  const canKick = isHost && Boolean(onKickParticipant);

  return (
    <>
      <section className="shrink-0">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          In circle
        </h3>
        <ul className="flex flex-col gap-1">
          {rows.map((row) => {
            const initials = initialsFromLabel(row.label);
            const showMenu = canKick && !row.isSelf;
            const isKicking = kickingUserId === row.userId;

            return (
              <li
                key={row.userId}
                className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-muted/40"
              >
                <RosterAvatar imageUrl={row.imageUrl} initials={initials} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {row.label}
                  {row.isSelf ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>
                  ) : null}
                </span>
                {showMenu ? (
                  <ParticipantKickMenuButton
                    participantLabel={row.label}
                    disabled={isKicking}
                    onRequestRemove={() =>
                      setConfirmTarget({
                        userId: row.userId,
                        displayName: row.label,
                        restrict: false,
                      })
                    }
                    onRequestRestrict={() =>
                      setConfirmTarget({
                        userId: row.userId,
                        displayName: row.label,
                        restrict: true,
                      })
                    }
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <ParticipantRemoveConfirmDialog
        target={confirmTarget}
        removing={kickingUserId != null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
        onConfirm={(target) => {
          if (!onKickParticipant) return;
          setConfirmTarget(null);
          void onKickParticipant(target.userId, target.displayName, {
            restrict: target.restrict,
          });
        }}
      />
    </>
  );
}
