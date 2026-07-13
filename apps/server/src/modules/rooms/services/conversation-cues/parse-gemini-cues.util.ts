import type {
  ConversationCueDto,
  ConversationCueKind,
} from "@/modules/rooms/services/conversation-cues/conversation-cues.types";

const ALLOWED_KINDS = new Set<ConversationCueKind>([
  "shared_session_activity",
  "shared_session_activity_detail",
  "peer_session_activity",
  "shared_interest",
  "shared_mood",
  "shared_looking_for",
  "shared_goal",
  "ai_generated",
]);

const CUE_ID_PATTERN = /^[a-z0-9_:-]{1,80}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function parseCueRow(raw: unknown, index: number): ConversationCueDto | null {
  if (!isRecord(raw)) return null;

  const idRaw = typeof raw.id === "string" ? raw.id.trim() : "";
  const id = idRaw || `ai_cue_${index}`;
  if (!CUE_ID_PATTERN.test(id)) return null;

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title || title.length > 140) return null;

  const bodyRaw = typeof raw.body === "string" ? raw.body.trim() : "";
  const body = bodyRaw.length > 0 ? bodyRaw.slice(0, 240) : null;

  const emojiRaw = typeof raw.emoji === "string" ? raw.emoji.trim() : "";
  const emoji = emojiRaw.length > 0 ? emojiRaw.slice(0, 8) : null;

  const kindRaw = typeof raw.kind === "string" ? raw.kind.trim() : "ai_generated";
  const kind = ALLOWED_KINDS.has(kindRaw as ConversationCueKind)
    ? (kindRaw as ConversationCueKind)
    : "ai_generated";

  const priorityRaw = raw.priority;
  const priority =
    typeof priorityRaw === "number" && Number.isFinite(priorityRaw)
      ? Math.min(100, Math.max(0, Math.round(priorityRaw)))
      : 50;

  return { id, kind, priority, title, body, emoji };
}

export function parseGeminiCuesResponse(text: string): ConversationCueDto[] {
  const cleaned = stripMarkdownFence(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned) as unknown;
  } catch {
    return [];
  }

  const rows = isRecord(parsed) && Array.isArray(parsed.cues) ? parsed.cues : [];
  const cues: ConversationCueDto[] = [];

  for (let i = 0; i < rows.length; i++) {
    const cue = parseCueRow(rows[i], i);
    if (cue) cues.push(cue);
  }

  const seen = new Set<string>();
  return cues
    .filter((cue) => {
      if (seen.has(cue.id)) return false;
      seen.add(cue.id);
      return true;
    })
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
