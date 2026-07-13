/**
 * Named HTTP rate-limit policies for authenticated `/api` routes.
 * Auth email/password paths use Better Auth's built-in limiter (see `auth.ts`).
 */
export const HTTP_RATE_LIMITS = {
  geocode: { limit: 30, windowSec: 60 },
  conversationCues: { limit: 10, windowSec: 60 },
  matchingFind: { limit: 30, windowSec: 60 },
  profilePhotoPresign: { limit: 20, windowSec: 60 },
  profilePhotoEnsurePublic: { limit: 40, windowSec: 60 },
  problemReportCreate: { limit: 5, windowSec: 3600 },
  problemReportScreenshotPresign: { limit: 10, windowSec: 3600 },
  connectionRequest: { limit: 20, windowSec: 3600 },
  connectionCall: { limit: 15, windowSec: 3600 },
  rtcToken: { limit: 60, windowSec: 60 },
} as const;

export type HttpRateLimitBucket = keyof typeof HTTP_RATE_LIMITS;
