import { format } from "date-fns";
import * as z from "zod";

import { START_CIRCLE_COPY as C } from "@/features/circles/constants/start-circle-copy";
import {
  combineDateAndTime,
  defaultScheduleDateOneHourAhead,
} from "@/features/circles/lib/start-circle-utils";
import { DEFAULT_START_CIRCLE_ADVANCED } from "@/features/circles/types/start-circle-ui.types";

const advancedSchema = z.object({
  shouldHostStartMeeting: z.boolean(),
  shouldMeetingAutoStart: z.boolean(),
  circleExpirationMinutes: z.string().refine(
    (s) => {
      if (s === "") return true;
      const n = Number(s);
      return !Number.isNaN(n) && Number.isInteger(n) && n >= 1 && n <= 10080;
    },
    { message: "Enter minutes between 1 and 10080, or leave empty" },
  ),
  deleteCircleAfterCall: z.boolean(),
  hostControlsActiveSpeaker: z.boolean(),
});

export const startCircleFormSchema = z
  .object({
    title: z
      .string()
      .max(160, "Title is too long")
      .refine((s) => s.trim().length > 0, { message: C.toastAddTitle }),
    description: z.string().max(2000),
    categoryId: z.string().min(1, C.toastPickCategory),
    visibility: z.enum(["private", "public"]),
    maxParticipants: z.number().int().min(2).max(100),
    scheduleMode: z.enum(["instant", "scheduled"]),
    scheduleDate: z.date().optional(),
    scheduleTime: z.string().min(1, "Pick a time"),
    advanced: advancedSchema,
  })
  .superRefine((data, ctx) => {
    if (data.scheduleMode !== "scheduled") return;
    if (!data.scheduleDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: C.toastPickDate,
        path: ["scheduleDate"],
      });
      return;
    }
    const combined = combineDateAndTime(data.scheduleDate, data.scheduleTime);
    if (combined.getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: C.toastFutureTime,
        path: ["scheduleTime"],
      });
    }
  });

export type StartCircleFormValues = z.infer<typeof startCircleFormSchema>;

export function getDefaultStartCircleFormValues(
  categoryId = "",
): StartCircleFormValues {
  const d = defaultScheduleDateOneHourAhead();
  return {
    title: "",
    description: "",
    categoryId,
    visibility: "public",
    maxParticipants: 8,
    scheduleMode: "instant",
    scheduleDate: d,
    scheduleTime: format(d, "HH:mm"),
    advanced: {
      shouldHostStartMeeting:
        DEFAULT_START_CIRCLE_ADVANCED.shouldHostStartMeeting,
      shouldMeetingAutoStart:
        DEFAULT_START_CIRCLE_ADVANCED.shouldMeetingAutoStart,
      circleExpirationMinutes: "",
      deleteCircleAfterCall:
        DEFAULT_START_CIRCLE_ADVANCED.deleteCircleAfterCall,
      hostControlsActiveSpeaker:
        DEFAULT_START_CIRCLE_ADVANCED.hostControlsActiveSpeaker,
    },
  };
}
