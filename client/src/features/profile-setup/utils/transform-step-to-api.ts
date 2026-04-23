/**
 * Transforms form values to API payload shape for POST /profile-setup.
 * Form stores flat keys; API expects step-specific data.
 */

import type { SaveProfileSetupPayload } from "../types/profile-setup-api.types";

type FormValues = Record<string, unknown>;
type StepField = { key: string; id?: string };

type Step5PayloadData = Extract<SaveProfileSetupPayload, { step: 5 }>["data"];

function toIdArray(value: unknown): Array<{ id: string }> {
  if (!Array.isArray(value) || value.length === 0) return [];
  return value
    .map((v) => (typeof v === "string" ? v : (v as { id?: string })?.id))
    .filter(Boolean)
    .map((id) => ({ id: String(id) }));
}

export function transformStepToApiPayload(
  step: number,
  formValues: FormValues,
  stepFields?: StepField[],
): SaveProfileSetupPayload {
  switch (step) {
    case 1: {
      const username = String(formValues.username ?? "").trim().toLowerCase();
      if (username.length < 3) throw new Error("Username must be at least 3 characters");
      if (!/^[a-zA-Z0-9_]+$/.test(username))
        throw new Error("Username may only contain letters, numbers, and underscores");
      return {
        step: 1,
        data: {
          displayName: String(formValues.displayName ?? "").trim(),
          username,
          age: Number(formValues.age),
          gender: String(formValues.gender),
        },
      };
    }

    case 2: {
      const goals = toIdArray(formValues.goals);
      if (goals.length === 0) throw new Error("At least one goal is required");
      return { step: 2, data: { goals } };
    }

    case 3: {
      const interests = toIdArray(formValues.interests);
      if (interests.length === 0) throw new Error("At least one interest is required");
      return { step: 3, data: { interests } };
    }

    case 4: {
      const professionVal = formValues.profession;
      const profession =
        professionVal && typeof professionVal === "string" && professionVal.trim()
          ? { id: String(professionVal).trim() }
          : professionVal &&
              typeof professionVal === "object" &&
              professionVal !== null &&
              "id" in professionVal &&
              (professionVal as { id: string }).id
          ? {
              id: (professionVal as { id: string }).id,
              name: (professionVal as { name?: string }).name,
              category: (professionVal as { category?: string }).category,
            }
          : null;
      return { step: 4, data: { profession } };
    }

    case 5: {
      const data: Step5PayloadData = {
        bio: formValues.bio != null && String(formValues.bio).trim()
          ? String(formValues.bio).trim()
          : undefined,
        photos: undefined,
        instagram: formValues.instagram ? String(formValues.instagram).trim().replace(/^@/, "") : undefined,
        twitter: formValues.twitter ? String(formValues.twitter).trim().replace(/^@/, "") : undefined,
      };
      const photosRaw = formValues.photos;
      if (Array.isArray(photosRaw) && photosRaw.length > 0) {
        const photos = photosRaw
          .map((p: unknown) => {
            const item = p as { url?: string; order?: number };
            if (item?.url) return { url: item.url, order: item.order };
            return null;
          })
          .filter(Boolean) as Array<{ url: string; order?: number }>;
        if (photos.length > 0) data.photos = photos;
      }
      return { step: 5, data };
    }

    case 6: {
      const answers = (stepFields ?? [])
        .filter((f) => f.id && formValues[f.key] && String(formValues[f.key]).trim())
        .map((f) => ({
          questionId: f.id!,
          answer: String(formValues[f.key]).trim(),
        }));
      return { step: 6, data: { answers } };
    }

    default:
      throw new Error(`Unknown step: ${step}`);
  }
}
