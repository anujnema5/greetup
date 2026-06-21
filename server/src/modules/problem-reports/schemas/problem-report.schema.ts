import { z } from "zod";

import { PROFILE_IMAGE_ALLOWED_CONTENT_TYPES } from "@/core/storage";

/** Which surface the user reported from. Combined with guest status to derive the stored `source`. */
export const problemReportSurfaceEnum = z.enum(["room", "app"]);
export type ProblemReportSurface = z.infer<typeof problemReportSurfaceEnum>;

const metadataSchema = z
  .object({
    route: z.string().max(512).optional(),
    userAgent: z.string().max(512).optional(),
    appVersion: z.string().max(64).optional(),
    platform: z.string().max(64).optional(),
  })
  .optional();

export const createProblemReportBodySchema = z.object({
  surface: problemReportSurfaceEnum,
  roomId: z.string().uuid().optional(),
  description: z.string().trim().min(1, "Please describe the problem").max(5000),
  screenshotUrl: z.string().url().optional(),
  metadata: metadataSchema,
});

export type CreateProblemReportBody = z.infer<typeof createProblemReportBodySchema>;

export const presignReportScreenshotBodySchema = z.object({
  contentType: z.enum(PROFILE_IMAGE_ALLOWED_CONTENT_TYPES),
});

export type PresignReportScreenshotBody = z.infer<typeof presignReportScreenshotBodySchema>;
