import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

export function labelsFromIds(ids: string[], catalog: Array<{ id: string; label: string }>) {
  const m = new Map(catalog.map((x) => [x.id, x.label]));
  return ids.map((id) => m.get(id)).filter(Boolean).join(", ");
}

export function professionLabel(id: string | null, catalog: Array<{ id: string; label: string }>) {
  if (!id) return "Not set";
  return catalog.find((p) => p.id === id)?.label ?? "—";
}

export function rtkErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const d = (error as FetchBaseQueryError).data;
    if (
      d &&
      typeof d === "object" &&
      "message" in d &&
      typeof (d as { message?: string }).message === "string"
    ) {
      return (d as { message: string }).message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong";
}
