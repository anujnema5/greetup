import type { ZodError } from "zod";

/** Maps Zod `flatten().fieldErrors` into the API `{ field, messages }[]` shape. */
export function zodFieldErrorsItems(error: ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  return Object.entries(fieldErrors).map(([field, messages]) => ({
    field,
    messages: messages ?? [],
  }));
}
