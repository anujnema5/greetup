import type { ZodError } from "zod";

/**
 * Maps Zod issues into `{ field, messages }[]` with dotted paths (e.g. `data.username`)
 * so clients can attach errors to form fields.
 */
export function zodFieldErrorsItems(error: ZodError) {
  const byField = new Map<string, string[]>();
  for (const issue of error.issues) {
    const field = issue.path.length ? issue.path.join(".") : "";
    if (!field) continue;
    const list = byField.get(field) ?? [];
    list.push(issue.message);
    byField.set(field, list);
  }
  return Array.from(byField.entries()).map(([field, messages]) => ({
    field,
    messages,
  }));
}
