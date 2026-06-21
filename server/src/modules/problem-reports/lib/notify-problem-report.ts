/**
 * Emails the dev inbox when a problem report comes in.
 * Fire-and-forget: a mail failure must never fail the user's submission.
 */

import logger from "@/core/logging";
import { sendEmail } from "@/services/email";
import { DEV_NOTIFICATION_EMAIL } from "@/shared/constants";
import type { ProblemReport } from "@/core/database/schema";

export function notifyProblemReportRaised(report: ProblemReport): void {
  const lines = [
    `Source: ${report.source}`,
    `User: ${report.userId}`,
    report.roomId ? `Room: ${report.roomId}` : null,
    report.screenshotUrl ? `Screenshot: ${report.screenshotUrl}` : null,
    report.metadata?.route ? `Route: ${report.metadata.route}` : null,
    report.metadata?.appVersion ? `App version: ${report.metadata.appVersion}` : null,
    report.metadata?.platform ? `Platform: ${report.metadata.platform}` : null,
    report.metadata?.userAgent ? `User agent: ${report.metadata.userAgent}` : null,
    "",
    "Description:",
    report.description,
  ].filter((l): l is string => l !== null);

  void sendEmail({
    to: DEV_NOTIFICATION_EMAIL,
    subject: `[Problem report] ${report.source} — ${report.id}`,
    text: lines.join("\n"),
  }).catch((error) => {
    logger.error("notify_problem_report_failed", { reportId: report.id, error });
  });
}
