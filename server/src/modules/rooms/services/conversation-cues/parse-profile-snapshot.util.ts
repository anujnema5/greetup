export type ProfileSnapshotContext = {
  displayName: string;
  bio: string | null;
  age: number | null;
  professions: string[];
  interests: string[];
  goals: string[];
  moods: string[];
  lookingFor: string[];
  sessionActivities: {
    name: string;
    label: string;
    detail: string | null;
    emoji: string | null;
  }[];
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function labelFromRelation(
  row: { displayName?: string | null; name?: string | null } | null | undefined,
): string | null {
  if (!row) return null;
  const display = row.displayName?.trim();
  if (display) return display;
  const name = row.name?.trim();
  return name || null;
}

function collectLabels(value: unknown, childKey: string): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const child = item[childKey];
    if (!isRecord(child)) continue;
    const label = labelFromRelation(child);
    if (label) out.push(label);
  }
  return out;
}

function parseSessionActivities(cs: JsonRecord): ProfileSnapshotContext["sessionActivities"] {
  const rows = cs.activities;
  if (!Array.isArray(rows)) return [];

  const out: ProfileSnapshotContext["sessionActivities"] = [];
  for (const item of rows) {
    if (!isRecord(item)) continue;
    const activity = isRecord(item.activity) ? item.activity : item;
    const name = typeof activity.name === "string" ? activity.name.trim() : "";
    const label = labelFromRelation(activity);
    if (!name || !label) continue;

    const emojiRaw = activity.emoji;
    const emoji =
      typeof emojiRaw === "string" && emojiRaw.trim().length > 0 ? emojiRaw.trim() : null;

    const detail =
      typeof item.detail === "string" && item.detail.trim().length > 0
        ? item.detail.trim()
        : null;

    out.push({ name, label, detail, emoji });
  }
  return out;
}

/** Reads cached `user:profile:snapshot:{userId}` JSON for Gemini prompts. */
export function parseProfileSnapshotContext(raw: unknown): ProfileSnapshotContext | null {
  if (!isRecord(raw)) return null;

  const user = isRecord(raw.user) ? raw.user : {};
  const displayName =
    (typeof user.displayName === "string" && user.displayName.trim()) ||
    (typeof user.name === "string" && user.name.trim()) ||
    "Someone";
  const age = typeof user.age === "number" && Number.isFinite(user.age) ? user.age : null;
  const bioRaw = typeof raw.bio === "string" ? raw.bio.trim() : "";
  const bio = bioRaw.length > 0 ? bioRaw : null;

  const currentStatus = isRecord(raw.currentStatus) ? raw.currentStatus : {};

  return {
    displayName,
    bio,
    age,
    professions: collectLabels(raw.professions, "profession"),
    interests: collectLabels(raw.interests, "interest"),
    goals: collectLabels(raw.goals, "goal"),
    moods: collectLabels(currentStatus.moods, "mood"),
    lookingFor: collectLabels(currentStatus.lookingFor, "lookingForOption"),
    sessionActivities: parseSessionActivities(currentStatus),
  };
}
