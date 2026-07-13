import { Hono } from "hono";
import { rateLimitUser } from "@/core/rate-limit";

import {
  handleCreateProblemReport,
  handlePresignReportScreenshot,
} from "./controllers/problem-reports.controller";

export const problemReportsRoute = new Hono();

problemReportsRoute.post(
  "/",
  rateLimitUser("problemReportCreate"),
  handleCreateProblemReport,
);
problemReportsRoute.post(
  "/screenshot-upload-url",
  rateLimitUser("problemReportScreenshotPresign"),
  handlePresignReportScreenshot,
);
