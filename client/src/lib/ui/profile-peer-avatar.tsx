import { profileAvatarGradientClass } from "@/features/profile/lib/profile-insights-display";
import { cn } from "@/lib/utils";
import { nameInitials } from "@/lib/utils/name-initials";

import { getProfileImageUrl } from "./profile-image";

type ProfilePeerAvatarProps = {
  image?: string | null;
  label: string;
  seed: string;
  className?: string;
};

export function ProfilePeerAvatar({ image, label, seed, className }: ProfilePeerAvatarProps) {
  const src = getProfileImageUrl(image);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={cn("object-cover", className)} />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-full bg-linear-to-br font-semibold text-white",
        profileAvatarGradientClass(seed),
        className,
      )}
      aria-hidden
    >
      {nameInitials(label)}
    </div>
  );
}
