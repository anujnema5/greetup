import { getProfileImageUrl } from "@/lib/ui/profile-image";

export type ResolveSpaceHostAvatarParams = {
  hostImage: string | null | undefined;
  isHost: boolean;
  viewerPrimaryPhotoUrl?: string | null;
};

export function resolveSpaceHostAvatarSrc({
  hostImage,
  isHost,
  viewerPrimaryPhotoUrl,
}: ResolveSpaceHostAvatarParams): string {
  const image = isHost
    ? viewerPrimaryPhotoUrl?.trim() || hostImage
    : hostImage;

  return getProfileImageUrl(image) ?? "";
}
