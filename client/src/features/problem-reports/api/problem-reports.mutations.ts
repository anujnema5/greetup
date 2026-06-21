"use client";

import { useMutation } from "@tanstack/react-query";

import { API_ENDPOINTS, apiFetch } from "@/lib/api";

import type {
  CreateProblemReportArg,
  PresignReportScreenshotData,
  ReportScreenshotContentType,
} from "../types/problem-reports.types";

const { PROBLEM_REPORTS } = API_ENDPOINTS;

export function useCreateProblemReport() {
  return useMutation({
    mutationFn: (arg: CreateProblemReportArg) =>
      apiFetch<{ id: string }>(PROBLEM_REPORTS.CREATE, {
        method: "POST",
        body: JSON.stringify(arg),
      }),
  });
}

export function usePresignReportScreenshot() {
  return useMutation({
    mutationFn: (body: { contentType: ReportScreenshotContentType }) =>
      apiFetch<PresignReportScreenshotData>(PROBLEM_REPORTS.SCREENSHOT_UPLOAD_URL, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}
