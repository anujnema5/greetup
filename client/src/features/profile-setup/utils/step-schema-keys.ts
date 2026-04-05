export function generateKey(data: unknown): string | undefined {
  if (data == null) return undefined;

  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    if ("id" in o) {
      return String(o.id);
    }
    if ("name" in o) {
      return String(o.name);
    }
    const keys = Object.keys(o);
    if (keys.length > 0) {
      return String(o[keys[0]!]);
    }
  }

  return undefined;
}
