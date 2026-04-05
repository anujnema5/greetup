/**
 * Escape `%`, `_`, and `\` for safe use inside PostgreSQL `ILIKE` patterns.
 */
export function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
