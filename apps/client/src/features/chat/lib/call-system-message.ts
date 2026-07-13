export type ConnectionCallHistoryStatus = 'completed' | 'missed' | 'declined' | 'cancelled';

export type ConnectionCallSystemPayload = {
  event: 'connection_call';
  mode: 'audio' | 'video';
  status: ConnectionCallHistoryStatus;
  durationSec: number | null;
  initiatorUserId: string;
};

export function isConnectionCallSystemPayload(payload: unknown): payload is ConnectionCallSystemPayload {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) return false;
  const o = payload as Record<string, unknown>;
  return (
    o.event === 'connection_call'
    && (o.mode === 'audio' || o.mode === 'video')
    && (o.status === 'completed' || o.status === 'missed' || o.status === 'declined' || o.status === 'cancelled')
    && typeof o.initiatorUserId === 'string'
  );
}

function modeLabel(mode: ConnectionCallSystemPayload['mode']): string {
  return mode === 'video' ? 'Video call' : 'Voice call';
}

function formatDuration(durationSec: number): string {
  if (durationSec < 60) {
    const s = Math.max(0, durationSec);
    return `0:${String(s).padStart(2, '0')}`;
  }
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export type CallSystemMessageView = {
  label: string;
  tone: 'default' | 'missed' | 'muted';
};

/** Thread label for the signed-in viewer (WhatsApp / Instagram style). */
export function formatCallSystemMessage(
  payload: ConnectionCallSystemPayload,
  currentUserId: string,
): CallSystemMessageView {
  const label = modeLabel(payload.mode);
  const isCaller = payload.initiatorUserId === currentUserId;

  switch (payload.status) {
    case 'completed': {
      const dur = payload.durationSec ?? 0;
      return {
        label: dur > 0 ? `${label} · ${formatDuration(dur)}` : label,
        tone: 'default',
      };
    }
    case 'missed':
      if (isCaller) {
        return { label: 'No answer', tone: 'muted' };
      }
      return {
        label: `Missed ${payload.mode === 'video' ? 'video' : 'voice'} call`,
        tone: 'missed',
      };
    case 'declined':
      if (isCaller) {
        return { label: `${label} declined`, tone: 'muted' };
      }
      return { label: 'Declined call', tone: 'muted' };
    case 'cancelled':
      if (isCaller) {
        return { label: 'Call cancelled', tone: 'muted' };
      }
      return { label: `${label} cancelled`, tone: 'muted' };
    default:
      return { label, tone: 'default' };
  }
}

/** Neutral preview for inbox / fallback when viewer is unknown. */
export function formatCallSystemPreview(payload: ConnectionCallSystemPayload): string {
  const label = modeLabel(payload.mode);
  switch (payload.status) {
    case 'completed': {
      const dur = payload.durationSec ?? 0;
      return dur > 0 ? `${label} · ${formatDuration(dur)}` : label;
    }
    case 'missed':
      return `Missed ${payload.mode === 'video' ? 'video' : 'voice'} call`;
    case 'declined':
      return `${label} declined`;
    case 'cancelled':
      return `${label} cancelled`;
    default:
      return label;
  }
}

export function isMissedCallPreview(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return t.includes('missed') && t.includes('call');
}
