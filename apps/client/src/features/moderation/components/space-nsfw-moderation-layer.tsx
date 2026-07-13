"use client";

import { useSpaceNsfwModeration } from "@/features/moderation/hooks/use-space-nsfw-moderation";
import type { UseSpaceNsfwModerationArgs } from "@/features/moderation/hooks/use-space-nsfw-moderation";
import { NSFWJS_IS_ENABLED } from "@/shared/constants";

/** Isolates NSFW interval + classify from the in-call shell render tree. */
export function SpaceNsfwModerationLayer(props: UseSpaceNsfwModerationArgs) {
  useSpaceNsfwModeration({
    ...props,
    enabled: NSFWJS_IS_ENABLED && props.enabled,
  });
  return null;
}
