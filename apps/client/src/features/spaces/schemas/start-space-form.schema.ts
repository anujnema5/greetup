import { format } from "date-fns";
import * as z from "zod";

import { LAUNCH_MAX_SPACE_PARTICIPANTS } from "@/features/spaces/constants/space-capacity";
import { START_SPACE_COPY as C } from "@/features/spaces/constants/start-space-copy";
import {
  combineDateAndTime,
  defaultScheduleDateOneHourAhead,
} from "@/features/spaces/lib/start-space-utils";
import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";
import { advancedOptionsFromApi, DEFAULT_START_SPACE_ADVANCED } from "@/features/spaces/types/start-space-ui.types";

const advancedSchema = z.object({
  shouldHostStartMeeting: z.boolean(),
  shouldMeetingAutoStart: z.boolean(),
  spaceExpirationMinutes: z.string().refine(
    (s) => {
      if (s === "") return true;
      const n = Number(s);
      return !Number.isNaN(n) && Number.isInteger(n) && n >= 1 && n <= 10080;
    },
    { message: "Enter minutes between 1 and 10080, or leave empty" },
  ),
  deleteSpaceAfterCall: z.boolean(),
  hostControlsActiveSpeaker: z.boolean(),
});

export const startSpaceFormSchema = z
  .object({
    title: z
      .string()
      .max(160, "Title is too long")
      .refine((s) => s.trim().length > 0, { message: C.toastAddTitle }),
    description: z.string().max(2000),
    categoryId: z.string().min(1, C.toastPickCategory),
    visibility: z.enum(["private", "public"]),
    maxParticipants: z.number().int().min(2).max(LAUNCH_MAX_SPACE_PARTICIPANTS),
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

export type StartSpaceFormValues = z.infer<typeof startSpaceFormSchema>;

export function getDefaultStartSpaceFormValues(
  categoryId = "",
): StartSpaceFormValues {
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
        DEFAULT_START_SPACE_ADVANCED.shouldHostStartMeeting,
      shouldMeetingAutoStart:
        DEFAULT_START_SPACE_ADVANCED.shouldMeetingAutoStart,
      spaceExpirationMinutes: "",
      deleteSpaceAfterCall:
        DEFAULT_START_SPACE_ADVANCED.deleteSpaceAfterCall,
      hostControlsActiveSpeaker:
        DEFAULT_START_SPACE_ADVANCED.hostControlsActiveSpeaker,
    },
  };
}

/** Prefill the start-space form when editing an upcoming scheduled space from the dashboard. */
export function getStartSpaceFormValuesFromActiveSpace(
  space: ActiveSpaceItem,
): StartSpaceFormValues {
  const start = space.scheduledStartAt
    ? new Date(space.scheduledStartAt)
    : defaultScheduleDateOneHourAhead();
  const scheduleDate = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  return {
    ...getDefaultStartSpaceFormValues(space.category.id),
    title: space.title,
    description: space.description?.trim() ?? "",
    categoryId: space.category.id,
    visibility: space.visibility,
    maxParticipants: space.maxParticipants,
    scheduleMode: "scheduled",
    scheduleDate,
    scheduleTime: format(start, "HH:mm"),
    advanced: advancedOptionsFromApi(space.advancedOptions),
  };
}
