type JsonRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is JsonRecord => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const toStringOrNull = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

export const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const parseDateToMs = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
};

export const unique = (values: string[]): string[] => {
  return [...new Set(values)];
};

export const collectNestedIds = (value: unknown, childKey: string): string[] => {
  if (!Array.isArray(value)) return [];

  const ids: string[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const child = item[childKey];
    if (!isRecord(child)) continue;
    const id = toStringOrNull(child.id);
    if (id) ids.push(id);
  }
  return ids;
};

export const buildMatchIds = (
  interestIds: string[],
  goalIds: string[],
  professionIds: string[],
): string[] => {
  return unique([
    ...interestIds.map((id) => `interest:${id}`),
    ...goalIds.map((id) => `goal:${id}`),
    ...professionIds.map((id) => `profession:${id}`),
  ]);
};
