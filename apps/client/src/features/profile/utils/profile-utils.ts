import { getApiErrorMessage } from '@/lib/api/fetch-client';

export function labelsFromIds(ids: string[], catalog: Array<{ id: string; label: string }>) {
  const m = new Map(catalog.map((x) => [x.id, x.label]));
  return ids.map((id) => m.get(id)).filter(Boolean).join(', ');
}

export function professionLabel(id: string | null, catalog: Array<{ id: string; label: string }>) {
  if (!id) return 'Not set';
  return catalog.find((p) => p.id === id)?.label ?? '—';
}

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  return getApiErrorMessage(error, fallback);
}
