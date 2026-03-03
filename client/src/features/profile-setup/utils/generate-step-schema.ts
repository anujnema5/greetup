import { z } from "zod";

export const generateStepSchema = (fields: any[]) => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    fields.forEach((field) => {
        let fieldSchema;

        switch (field.type) {
            case "text":
            case "textarea": {
                fieldSchema = z.string();
                if (field.maxLength) {
                    fieldSchema = fieldSchema.max(
                        field.maxLength,
                        `Maximum ${field.maxLength} characters`
                    );
                }

                if (field.required) {
                    fieldSchema = fieldSchema.min(1, `${field.label} is required`);
                } else {
                    // Allow empty string, null, undefined for optional fields
                    fieldSchema = fieldSchema.optional().nullable();
                }
                break;
            }

            case "number": {
                fieldSchema = z.coerce.number();

                if (field.required) {
                    fieldSchema = fieldSchema.refine(
                        (val) => val != null && !Number.isNaN(val),
                        { message: `${field.label} is required` }
                    );
                } else {
                    fieldSchema = fieldSchema.optional();
                }

                if (field.min !== undefined) {
                    fieldSchema = fieldSchema.refine(
                        (val) => val == null || val >= field.min,
                        { message: `Minimum value is ${field.min}` }
                    );
                }

                if (field.max !== undefined) {
                    fieldSchema = fieldSchema.refine(
                        (val) => val == null || val <= field.max,
                        { message: `Maximum value is ${field.max}` }
                    );
                }
                break;
            }

            case "select":
            case "radio": {
                fieldSchema = z.string();
                if (field.required) {
                    fieldSchema = fieldSchema.min(1, `${field.label} is required`);
                } else {
                    fieldSchema = fieldSchema.optional();
                }

                if (Array.isArray(field.options)) {
                    const validOptions = field.options.map(generateKey);
                    fieldSchema = fieldSchema.refine(
                        (val) => !val || validOptions.includes(val),
                        { message: `Please select a valid ${field.label}` }
                    );
                }
                break;
            }

            case "multi-select": {
                fieldSchema = z.array(z.any());
                if (field.required) {
                    fieldSchema = fieldSchema.min(1, `Select at least one ${field.label}`);
                }
                if (field.max) {
                    fieldSchema = fieldSchema.max(field.max);
                }
                break;
            }

            case "toggle":
                fieldSchema = z.boolean().default(false);
                break;

            case "range":
                fieldSchema = z.object({
                    min: z.number(),
                    max: z.number(),
                });
                break;

            case "photo-upload":
                fieldSchema = z.array(z.any());
                if (field.max) {
                    fieldSchema = fieldSchema.max(field.max);
                }
                break;

            case "country-select":
                fieldSchema = z
                    .object({
                        code: z.string().min(1),
                        name: z.string().min(1),
                    })
                    .optional();
                break;

            default:
                fieldSchema = z.any().optional();
        }

        schemaFields[field.key] = fieldSchema;
    });

    return z.object(schemaFields);
};


export const generateKey = (data: any): string | undefined => {
    if (data == null) return undefined;

    if (typeof data === "string") {
        return data;
    }

    if (typeof data === "object") {
        if ("id" in data) {
            return String(data.id);
        }

        if ("name" in data) {
            return String(data.name);
        }

        const keys = Object.keys(data);
        if (keys.length > 0) {
            return String(data[keys[0]]);
        }
    }

    return undefined;
};

// Helper to get default values for a step
export const getStepDefaultValues = (fields: any[]): Record<string, any> => {
    const defaults: Record<string, any> = {};

    fields.forEach(field => {
        switch (field.type) {
            case 'text':
            case 'textarea':
                defaults[field.key] = field.value || '';
                break;

            case 'number':
                defaults[field.key] = field.value || '';
                break;

            case 'select':
            case 'radio': {
                const raw = field.value;
                // When options are objects (e.g. profession), backend sends { id, name, category };
                // Select expects string (option id) to match SelectItem value
                const normalized =
                    raw &&
                    typeof raw === 'object' &&
                    !Array.isArray(raw) &&
                    'id' in raw
                        ? String((raw as { id: string }).id)
                        : raw || '';
                defaults[field.key] = normalized;
                break;
            }

            case 'multi-select': {
                const raw = field.value || [];
                // Normalize: server may send [{ id, name }]; form expects string[] (ids)
                const normalized = Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object' && raw[0] !== null && 'id' in raw[0]
                    ? raw.map((o: { id?: string }) => o?.id).filter(Boolean)
                    : raw;
                defaults[field.key] = normalized;
                break;
            }

            case 'toggle':
                defaults[field.key] = field.value !== undefined ? field.value : false;
                break;

            case 'range':
                defaults[field.key] = field.value || {
                    min: field.min || 18,
                    max: field.max || 60
                };
                break;

            case 'photo-upload':
                defaults[field.key] = field.value || [];
                break;

            case 'country-select':
                defaults[field.key] = field.value || undefined;
                break;

            default:
                defaults[field.key] = field.value;
        }
    });

    return defaults;
};