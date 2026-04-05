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

      case "number":
        defaults[field.key] = field.value || "";
        break;

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
