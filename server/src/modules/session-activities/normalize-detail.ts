export function normalizeActivityDetail(value: string): string {
  return value.trim().toLowerCase();
}

export function trimActivityDetail(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
