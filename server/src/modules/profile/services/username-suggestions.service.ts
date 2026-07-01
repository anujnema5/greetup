import { profileSetupRepository } from "../repositories/profile-setup.repository";
import { profileStepsRepository } from "../repositories/profile-steps.repository";
import {
  isPlaceholderUsername,
  isValidUsernameFormat,
  normalizeUsername,
  slugifyUsernameToken,
  trimUsernameToMax,
  type UsernameVibe,
} from "../lib/username";

const VIBE_ADJECTIVES: Record<UsernameVibe, string[]> = {
  cozy: ["quiet", "soft", "warm", "gentle", "calm", "hush"],
  playful: ["sunny", "spark", "bright", "bouncy", "witty", "peppy"],
  mysterious: ["midnight", "misty", "lunar", "velvet", "shadow", "dusky"],
  creative: ["amber", "golden", "wild", "vivid", "open", "free"],
  classic: ["clear", "true", "steady", "plain", "neat", "solid"],
  random: ["curious", "wandering", "open", "fresh", "free", "kind"],
};

const VIBE_NOUNS: Record<UsernameVibe, string[]> = {
  cozy: ["listener", "corner", "pause", "nest", "glow", "hush"],
  playful: ["spark", "buddy", "wave", "giggle", "orbit", "hop"],
  mysterious: ["echo", "whisper", "veil", "glow", "drift", "shade"],
  creative: ["ink", "canvas", "muse", "sketch", "story", "hue"],
  classic: ["voice", "folk", "soul", "line", "mark", "name"],
  random: ["soul", "voice", "path", "mind", "beat", "flow"],
};

const CONTEXT_SUFFIXES = ["", "_fan", "_club", "_mate", "_go"];

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function pick<T>(items: T[]): T {
  return items[randomInt(items.length)]!;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function uniqueCandidates(candidates: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of candidates) {
    const value = normalizeUsername(raw);
    if (!isValidUsernameFormat(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function buildNameCandidates(displayName: string | null): string[] {
  if (!displayName) return [];
  const base = slugifyUsernameToken(displayName);
  if (base.length < 3) return [];

  const candidates = [base, trimUsernameToMax(base, `_${randomInt(90) + 10}`)];
  const parts = displayName
    .trim()
    .split(/\s+/)
    .map(slugifyUsernameToken)
    .filter((part) => part.length >= 2);
  if (parts.length >= 2) {
    candidates.push(parts.join("_").slice(0, 30));
    candidates.push(`${parts[0]}_${parts[parts.length - 1]}`.slice(0, 30));
  }
  return uniqueCandidates(candidates);
}

function buildContextTokens(goalNames: string[], interestNames: string[]): string[] {
  const tokens = [...goalNames, ...interestNames]
    .map(slugifyUsernameToken)
    .filter((token) => token.length >= 3);
  return [...new Set(tokens)].slice(0, 6);
}

function buildCandidatePool(vibe: UsernameVibe, contextTokens: string[]): string[] {
  const adjectives = VIBE_ADJECTIVES[vibe];
  const nouns = VIBE_NOUNS[vibe];
  const candidates: string[] = [];

  for (const token of contextTokens) {
    for (const suffix of CONTEXT_SUFFIXES) {
      candidates.push(`${token}${suffix}`);
    }
    candidates.push(`${pick(adjectives)}_${token}`);
    candidates.push(`${token}_${pick(nouns)}`);
    candidates.push(trimUsernameToMax(token, `_${randomInt(90) + 10}`));
  }

  for (let i = 0; i < 12; i += 1) {
    const adj = pick(adjectives);
    const noun = pick(nouns);
    candidates.push(`${adj}_${noun}`);
    candidates.push(`${adj}_${noun}_${randomInt(90) + 10}`);
    candidates.push(`${noun}_${randomInt(900) + 100}`);
  }

  return uniqueCandidates(candidates);
}

async function filterAvailable(
  userId: string,
  candidates: string[],
  limit: number,
): Promise<string[]> {
  const available: string[] = [];
  for (const username of candidates) {
    const taken = await profileSetupRepository.isUsernameTakenByOther(userId, username);
    if (!taken) available.push(username);
    if (available.length >= limit) break;
  }
  return available;
}

export async function checkUsernameAvailabilityService(args: {
  userId: string;
  username: string;
}): Promise<{ username: string; available: boolean; valid: boolean }> {
  const username = normalizeUsername(args.username);
  const valid = isValidUsernameFormat(username);
  if (!valid) {
    return { username, available: false, valid: false };
  }
  const taken = await profileSetupRepository.isUsernameTakenByOther(args.userId, username);
  return { username, available: !taken, valid: true };
}

export async function suggestUsernamesService(args: {
  userId: string;
  vibe?: UsernameVibe;
  limit?: number;
}): Promise<{
  suggestions: string[];
  displayName: string | null;
  vibe: UsernameVibe;
}> {
  const vibe: UsernameVibe = args.vibe ?? "random";
  const limit = Math.min(Math.max(args.limit ?? 5, 1), 8);

  const profile = await profileStepsRepository.getProfileForSteps(args.userId);
  const displayName = profile?.user?.displayName?.trim() || profile?.user?.name?.trim() || null;

  const goalNames =
    profile?.goals?.map((row) => row.goal.displayName || row.goal.name).filter(Boolean) ?? [];
  const interestNames =
    profile?.interests
      ?.map((row) => row.interest.displayName || row.interest.name)
      .filter(Boolean) ?? [];

  const contextTokens = buildContextTokens(goalNames, interestNames);
  const nameBased = buildNameCandidates(displayName);
  const generated = shuffle(buildCandidatePool(vibe, contextTokens));
  const pool = uniqueCandidates([...nameBased, ...generated]);
  const suggestions = await filterAvailable(args.userId, pool, limit);

  const current = profile?.user?.username;
  if (
    suggestions.length < limit &&
    current &&
    !isPlaceholderUsername(current) &&
    isValidUsernameFormat(current) &&
    !suggestions.includes(current)
  ) {
    suggestions.unshift(current);
  }

  return {
    suggestions: suggestions.slice(0, limit),
    displayName,
    vibe,
  };
}
