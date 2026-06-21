import { Hono } from "hono";

import {
  handleCreateProblemReport,
  handlePresignReportScreenshot,
} from "./controllers/problem-reports.controller";

export const problemReportsRoute = new Hono();

problemReportsRoute.post("/", handleCreateProblemReport);
problemReportsRoute.post("/screenshot-upload-url", handlePresignReportScreenshot);
