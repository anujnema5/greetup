"use client";

import { useCallback } from "react";

import { usePresignReportScreenshot } from "../api/problem-reports.mutations";
import {
  REPORT_SCREENSHOT_CONTENT_TYPES,
  type ReportScreenshotContentType,
} from "../types/problem-reports.types";

/** 5 MB — screenshots are small; reject anything larger before presigning. */
export const REPORT_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

export function isAllowedScreenshotType(type: string): type is ReportScreenshotContentType {
  return (REPORT_SCREENSHOT_CONTENT_TYPES as readonly string[]).includes(type);
}

export function useUploadReportScreenshot() {
  const { mutateAsync: presign, isPending } = usePresignReportScreenshot();

  /** Presign + PUT to Spaces. Returns the public URL to attach to the report. */
  const uploadScreenshot = useCallback(
    async (file: File): Promise<string> => {
      if (!isAllowedScreenshotType(file.type)) {
        throw new Error("Please choose a PNG, JPG, WEBP, or GIF image");
      }
      if (file.size > REPORT_SCREENSHOT_MAX_BYTES) {
        throw new Error("Image is too large (max 5 MB)");
      }

      const presigned = await presign({
        contentType: file.type,
        contentLength: file.size,
      });
      const headers = presigned.uploadHeaders ?? { "Content-Type": presigned.contentType };

      const put = await fetch(presigned.uploadUrl, {
        method: "PUT",
        body: file,
        headers,
        credentials: "omit",
      });
      if (!put.ok) {
        throw new Error("Could not upload the screenshot");
      }

      return presigned.publicUrl;
    },
    [presign],
  );

  return { uploadScreenshot, isUploading: isPending };
}
