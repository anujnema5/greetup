/**
 * Transforms form values to API payload shape for POST /profile-setup.
 * Form stores flat keys; API expects step-specific data.
 */

import type { SaveProfileSetupPayload } from "../types/profile-setup-api.types";

type FormValues = Record<string, unknown>;

type Step5PayloadData = Extract<SaveProfileSetupPayload, { step: 5 }>["data"];
type Step6PayloadData = Extract<SaveProfileSetupPayload, { step: 6 }>["data"];

function toIdArray(value: unknown): Array<{ id: string }> {
  if (!Array.isArray(value) || value.length === 0) return [];
  return value
    .map((v) => (typeof v === "string" ? v : (v as { id?: string })?.id))
    .filter(Boolean)
    .map((id) => ({ id: String(id) }));
}

export function transformStepToApiPayload(
  step: number,
  formValues: FormValues
): SaveProfileSetupPayload {
  switch (step) {
    case 1: {
      const country = formValues.country as { code?: string; name?: string } | undefined;
      if (!country?.code || !country?.name) {
        throw new Error("Country is required");
      }
      return {
        step: 1,
        data: {
          displayName: String(formValues.displayName ?? "").trim(),
          age: Number(formValues.age),
          gender: String(formValues.gender),
          country: { code: country.code, name: country.name },
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
        preferredGender: formValues.preferredGender
          ? String(formValues.preferredGender)
          : undefined,
        distancePreference: formValues.distancePreference
          ? String(formValues.distancePreference)
          : undefined,
        ageRange: undefined,
      };
      const ageRange = formValues.ageRange as { min?: number; max?: number } | undefined;
      if (ageRange && typeof ageRange.min === "number" && typeof ageRange.max === "number") {
        data.ageRange = { min: ageRange.min, max: ageRange.max };
      }
      return { step: 5, data };
    }

    case 6: {
      const data: Step6PayloadData = {
        bio: formValues.bio != null && String(formValues.bio).trim()
          ? String(formValues.bio).trim()
          : undefined,
        photos: undefined,
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
      return { step: 6, data };
    }

    default:
      throw new Error(`Unknown step: ${step}`);
  }
}
