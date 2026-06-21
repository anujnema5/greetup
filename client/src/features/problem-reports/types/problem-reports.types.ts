/** Which surface the report was raised from. */
export type ProblemReportSurface = "room" | "app";

export type ProblemReportMetadata = {
  route?: string;
  userAgent?: string;
  appVersion?: string;
  platform?: string;
};

export type CreateProblemReportArg = {
  surface: ProblemReportSurface;
  roomId?: string;
  description: string;
  screenshotUrl?: string;
  metadata?: ProblemReportMetadata;
};

/** Image MIME types accepted for a screenshot (mirrors the server allow-list). */
export const REPORT_SCREENSHOT_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ReportScreenshotContentType = (typeof REPORT_SCREENSHOT_CONTENT_TYPES)[number];

export type PresignReportScreenshotData = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
  contentType: string;
  uploadHeaders?: Record<string, string>;
};

export type ReportProblemModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surface: ProblemReportSurface;
  /** Best-effort room context when reporting from inside a room. */
  roomId?: string;
  /** Elevate the dialog z-index when rendered over the in-call stage. */
  contentClassName?: string;
  overlayClassName?: string;
};
