import { z } from "zod";

import { PROFILE_IMAGE_ALLOWED_CONTENT_TYPES } from "@/core/storage";

const contentTypeEnum = z.enum(PROFILE_IMAGE_ALLOWED_CONTENT_TYPES);

export const presignProfileImageBodySchema = z.object({
  contentType: contentTypeEnum,
});

export type PresignProfileImageBody = z.infer<typeof presignProfileImageBodySchema>;
