import type { ProfileSetupField, ProfileSetupStep } from "@/features/profile-setup/types/profile-setup-api.types";

export type ProfileEditorCatalog = {
  goals: Array<{ id: string; label: string; emoji?: string }>;
  interests: Array<{ id: string; label: string; category?: string }>;
  professions: Array<{ id: string; label: string }>;
  promptQuestions: Array<{ id: string; key: string; question: string }>;
  goalMax: number;
  interestMax: number;
};

function optLabel(o: unknown): string {
  if (typeof o === "object" && o !== null && "name" in o && typeof (o as { name?: string }).name === "string") {
    return (o as { name: string }).name;
  }
  return "";
}

function mapMultiOptions(
  field: ProfileSetupField | undefined
): Array<{ id: string; label: string; emoji?: string; category?: string }> {
  if (!field || (field.type !== "multi-select" && field.type !== "select")) {
    return [];
  }
  const raw = field.options;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => {
      if (typeof o === "object" && o !== null && "id" in o) {
        const x = o as {
          id: string;
          name?: string;
          emoji?: string;
          category?: string;
        };
        return {
          id: x.id,
          label: x.name ?? optLabel(o),
          emoji: x.emoji,
          category: x.category,
        };
      }
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && Boolean(x.id));
}

export function buildProfileEditorCatalog(steps: ProfileSetupStep[]): ProfileEditorCatalog {
  const s2 = steps.find((s) => s.step === 2);
  const s3 = steps.find((s) => s.step === 3);
  const s4 = steps.find((s) => s.step === 4);
  const s6 = steps.find((s) => s.step === 6);

  const goalsField = s2?.fields.find((f) => f.key === "goals");
  const interestsField = s3?.fields.find((f) => f.key === "interests");
  const professionField = s4?.fields.find((f) => f.key === "profession");

  const goalsRaw = mapMultiOptions(goalsField);
  const goals = goalsRaw.map((g) => ({ id: g.id, label: g.label, emoji: g.emoji }));

  const interestsRaw = mapMultiOptions(interestsField);
  const interests = interestsRaw.map((i) => ({
    id: i.id,
    label: i.label,
    category: i.category,
  }));

  let professions: Array<{ id: string; label: string }> = [];
  if (professionField && professionField.type === "select" && Array.isArray(professionField.options)) {
    professions = professionField.options
      .map((o) => {
        if (typeof o === "object" && o !== null && "id" in o) {
          const x = o as { id: string; name?: string };
          return { id: x.id, label: x.name ?? "" };
        }
        return null;
      })
      .filter((p): p is { id: string; label: string } => p !== null && Boolean(p.id));
  }

  const interestMax =
    interestsField && interestsField.type === "multi-select"
      ? (interestsField as { max?: number }).max ?? 10
      : 10;

  const goalMax = 10;

  const promptQuestions: Array<{ id: string; key: string; question: string }> =
    (s6?.fields ?? [])
      .filter((f) => f.id && f.type === "textarea")
      .map((f) => ({ id: f.id as string, key: f.key, question: f.label }));

  return {
    goals,
    interests,
    professions,
    promptQuestions,
    goalMax,
    interestMax,
  };
}
