import {
  assertUploadedImageObjectAllowed,
  isValidReportScreenshotUrl,
  parseSpacesObjectKeyFromPublicUrl,
} from "@/core/storage";
import type { ProblemReport } from "@/core/database/schema";
import { ValidationError } from "@/shared/errors";

import { notifyProblemReportRaised } from "../lib/notify-problem-report";
import { problemReportsRepository } from "../repositories/problem-reports.repository";
import type { CreateProblemReportBody, ProblemReportSurface } from "../schemas/problem-report.schema";

type ProblemReportSource = ProblemReport["source"];

function resolveSource(surface: ProblemReportSurface, isGuest: boolean): ProblemReportSource {
  if (surface === "room") return isGuest ? "guest_room_modal" : "room_modal";
  return isGuest ? "guest_app" : "app";
}

export async function createProblemReportService(params: {
  userId: string;
  isGuest: boolean;
  body: CreateProblemReportBody;
}): Promise<ProblemReport> {
  const { userId, isGuest, body } = params;

  if (body.screenshotUrl) {
    if (!isValidReportScreenshotUrl(body.screenshotUrl, userId)) {
      throw new ValidationError("Invalid screenshot reference");
    }
    const key = parseSpacesObjectKeyFromPublicUrl(body.screenshotUrl);
    if (!key) {
      throw new ValidationError("Invalid screenshot reference");
    }
    await assertUploadedImageObjectAllowed(key);
  }

  // Room reports carry context, but a stale roomId (room ended between open and submit)
  // must not lose the report — drop it to null rather than fail the FK insert.
  let roomId: string | null = null;
  if (body.surface === "room" && body.roomId) {
    roomId = (await problemReportsRepository.roomExists(body.roomId)) ? body.roomId : null;
  }

  const report = await problemReportsRepository.create({
    userId,
    roomId,
    source: resolveSource(body.surface, isGuest),
    description: body.description,
    screenshotUrl: body.screenshotUrl ?? null,
    metadata: body.metadata ?? null,
  });

  notifyProblemReportRaised(report);
  return report;
}
