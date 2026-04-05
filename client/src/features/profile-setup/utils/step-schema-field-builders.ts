import { z } from "zod";

import { generateKey } from "./step-schema-keys";

/** Minimal field shape from GET /profile/setup-steps (dynamic forms). */
export type ProfileSetupStepField = {
  key: string;
  type: string;
  label?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: unknown[];
};

function plainTextSchema(field: ProfileSetupStepField): z.ZodTypeAny {
  let s: z.ZodTypeAny = z.string().trim();
  if (field.maxLength) {
    s = (s as z.ZodString).max(field.maxLength, `Maximum ${field.maxLength} characters`);
  }
  if (field.required) {
    const minLen = field.minLength ?? 1;
    s = (s as z.ZodString).min(
      minLen,
      minLen <= 1
        ? `${field.label} is required`
        : `At least ${minLen} characters`,
    );
  } else {
    s = s.optional().nullable();
  }
  return s;
}

function numberSchema(field: ProfileSetupStepField): z.ZodTypeAny {
  let n: z.ZodTypeAny = z.coerce.number();

  if (field.required) {
    n = n.refine(
      (val: unknown) => val != null && !Number.isNaN(val),
      { message: `${field.label} is required` },
    );
  } else {
    n = n.optional();
  }

  if (field.min !== undefined) {
    n = n.refine(
      (val: unknown) => val == null || Number(val) >= field.min!,
      { message: `Minimum value is ${field.min}` },
    );
  }

  if (field.max !== undefined) {
    n = n.refine(
      (val: unknown) => val == null || Number(val) <= field.max!,
      { message: `Maximum value is ${field.max}` },
    );
  }

  return n;
}

function selectOrRadioSchema(field: ProfileSetupStepField): z.ZodTypeAny {
  let s: z.ZodTypeAny = z.string();
  if (field.required) {
    s = (s as z.ZodString).min(1, `${field.label} is required`);
  } else {
    s = s.optional();
  }

  if (Array.isArray(field.options)) {
    const validOptions = field.options.map(generateKey);
    s = s.refine(
      (val: unknown) => !val || validOptions.includes(val as string),
      { message: `Please select a valid ${field.label}` },
    );
  }

  return s;
}

function multiSelectSchema(field: ProfileSetupStepField): z.ZodTypeAny {
  let arr = z.array(z.any());
  if (field.required) {
    arr = arr.min(1, `Select at least one ${field.label}`);
  }
  if (field.max) {
    arr = arr.max(field.max);
  }
  return arr;
}

function photoUploadSchema(field: ProfileSetupStepField): z.ZodTypeAny {
  let photos = z.array(z.any());
  if (field.max) {
    photos = photos.max(field.max);
  }
  return photos;
}

export function buildFieldSchema(field: ProfileSetupStepField): z.ZodTypeAny {
  switch (field.type) {
    case "text":
    case "textarea":
      return plainTextSchema(field);

    case "number":
      return numberSchema(field);

    case "select":
    case "radio":
      return selectOrRadioSchema(field);

    case "multi-select":
      return multiSelectSchema(field);

    case "toggle":
      return z.boolean().default(false);

    case "range":
      return z.object({
        min: z.number(),
        max: z.number(),
      });

    case "photo-upload":
      return photoUploadSchema(field);

    case "country-select": {
      const country = z.object({
        code: z.string().min(1, "Country is required"),
        name: z.string().min(1, "Country is required"),
      });
      return field.required === true ? country : country.optional();
    }

    default:
      return z.any().optional();
  }
}
