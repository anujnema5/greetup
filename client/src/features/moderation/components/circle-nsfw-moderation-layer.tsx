"use client";

import { useCircleNsfwModeration } from "@/features/moderation/hooks/use-circle-nsfw-moderation";
import type { UseCircleNsfwModerationArgs } from "@/features/moderation/hooks/use-circle-nsfw-moderation";
import { NSFWJS_IS_ENABLED } from "@/shared/constants";

/** Isolates NSFW interval + classify from the in-call shell render tree. */
export function CircleNsfwModerationLayer(props: UseCircleNsfwModerationArgs) {
  useCircleNsfwModeration({
    ...props,
    enabled: NSFWJS_IS_ENABLED && props.enabled,
  });
  return null;
}
