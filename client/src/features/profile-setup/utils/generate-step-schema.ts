import { z } from "zod";

import {
  buildFieldSchema,
  type ProfileSetupStepField,
} from "./step-schema-field-builders";

export { generateKey } from "./step-schema-keys";

export const generateStepSchema = (fields: readonly ProfileSetupStepField[]) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    schemaFields[field.key] = buildFieldSchema(field);
  }

  return z.object(schemaFields);
};

export const getStepDefaultValues = (fields: any[]): Record<string, any> => {
  const defaults: Record<string, any> = {};

  fields.forEach((field) => {
    switch (field.type) {
      case "text":
      case "textarea":
        defaults[field.key] = field.value || "";
        break;

      case "number": {
        const raw = field.value;
        if (typeof raw === "number" && Number.isFinite(raw)) {
          defaults[field.key] = raw;
        } else if (field.required && field.min !== undefined) {
          defaults[field.key] = field.min;
        } else {
          defaults[field.key] = "";
        }
        break;
      }

      case "select":
      case "radio": {
        const raw = field.value;
        const normalized =
          raw &&
          typeof raw === "object" &&
          !Array.isArray(raw) &&
          "id" in raw
            ? String((raw as { id: string }).id)
            : raw || "";
        defaults[field.key] = normalized;
        break;
      }

      case "multi-select": {
        const raw = field.value || [];
        const normalized =
          Array.isArray(raw) &&
          raw.length > 0 &&
          typeof raw[0] === "object" &&
          raw[0] !== null &&
          "id" in raw[0]
            ? raw.map((o: { id?: string }) => o?.id).filter(Boolean)
            : raw;
        defaults[field.key] = normalized;
        break;
      }

      case "toggle":
        defaults[field.key] = field.value !== undefined ? field.value : false;
        break;

      case "range":
        defaults[field.key] = field.value || {
          min: field.min || 18,
          max: field.max || 60,
        };
        break;

      case "photo-upload":
        defaults[field.key] = field.value || [];
        break;

      case "country-select":
        defaults[field.key] = field.value || undefined;
        break;

      default:
        defaults[field.key] = field.value;
    }
  });

  return defaults;
};

/** Drop invalid numeric values from restored localStorage so they don't override API defaults. */
export function normalizeStoredFormData(
  stored: Record<string, unknown>,
  steps: readonly { fields?: readonly ProfileSetupStepField[] }[],
): Record<string, unknown> {
  const out = { ...stored };

  for (const step of steps) {
    for (const field of step.fields ?? []) {
      if (field.type !== "number" || field.min === undefined) continue;

      const val = out[field.key];
      const num = typeof val === "number" ? val : val === "" ? Number.NaN : Number(val);

      if (!Number.isFinite(num) || num < field.min) {
        if (field.required) out[field.key] = field.min;
        else delete out[field.key];
      }
    }
  }

  return out;
};
