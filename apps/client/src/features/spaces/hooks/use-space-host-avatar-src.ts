"use client";

import { useMyProfile } from "@/features/profile-setup/api";

import { resolveSpaceHostAvatarSrc } from "../lib/resolve-space-host-avatar";
import type { ActiveSpaceHost } from "../types/spaces-api.types";

export function useSpaceHostAvatarSrc(
  host: ActiveSpaceHost,
  currentUserId: string | null,
): string {
  const { data: myProfile } = useMyProfile();
  const isHost = Boolean(currentUserId && host.userId === currentUserId);

  return resolveSpaceHostAvatarSrc({
    hostImage: host.image,
    isHost,
    viewerPrimaryPhotoUrl: myProfile?.photos?.[0]?.url,
  });
}
