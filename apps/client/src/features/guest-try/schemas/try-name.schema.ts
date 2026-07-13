import { z } from "zod";

const TRY_NAME_MIN_LENGTH = 2;
const TRY_NAME_MAX_LENGTH = 30;

const ALLOWED_NAME = /^[\p{L}\p{N}\s.'-]+$/u;
const URL_OR_EMAIL_PATTERN =
  /(?:https?:\/\/|www\.)|@[\w.-]+\.\w{2,}|[\w.-]+@[\w.-]+\.\w{2,}/i;

const BLOCKED_NAME_TERMS = ["admin", "moderator", "support", "greetup"] as const;

function normalizeTryName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export const tryNameSchema = z.object({
  displayName: z
    .string()
    .transform(normalizeTryName)
    .pipe(
      z
        .string()
        .min(TRY_NAME_MIN_LENGTH, "Name must be at least 2 characters")
        .max(TRY_NAME_MAX_LENGTH, "Name must be at most 30 characters")
        .refine((value) => ALLOWED_NAME.test(value), {
          message: "Only letters, numbers, spaces, and . ' - are allowed",
        })
        .refine((value) => !URL_OR_EMAIL_PATTERN.test(value), {
          message: "Name cannot include URLs or email addresses",
        })
        .refine(
          (value) => {
            const lowered = value.toLowerCase();
            return !BLOCKED_NAME_TERMS.some((term) => lowered.includes(term));
          },
          { message: "Please choose a different name" },
        ),
    ),
});

export type TryNameInput = z.infer<typeof tryNameSchema>;
