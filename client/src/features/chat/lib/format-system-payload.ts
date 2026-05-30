/** Renders server `system_payload` jsonb without "[object Object]". */
import { formatCallSystemPreview, isConnectionCallSystemPayload } from './call-system-message';

export function formatSystemPayload(payload: unknown): string {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'number' || typeof payload === 'boolean') return String(payload);

  if (typeof payload === 'object' && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    if (isConnectionCallSystemPayload(o)) return formatCallSystemPreview(o);
    if (typeof o.text === 'string') return o.text;
    if (typeof o.message === 'string') return o.message;
    if (typeof o.body === 'string') return o.body;
    if (o.event === 'user_added') return 'Someone joined the circle';
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return 'System message';
  }
}
