const DICEBEAR_VERSION = "9.x";
const AVATAR_STYLE = "adventurer";

const AVATAR_BACKGROUND_COLORS = [
  "b6e3f4",
  "c0aede",
  "d1d4f9",
  "ffd5dc",
  "ffdfbf",
  "c1f0c1",
  "f9e8a8",
  "e8d5f5",
] as const;

const DEFAULT_AVATAR_SIZE = 512;

export type GenerateAvatarOptions = {
  seed?: string;
  size?: number;
};

function hashSeed(seed: string): number {
  return seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function pickBackgroundForSeed(seed: string): string {
  const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0) * 31, 0);
  return AVATAR_BACKGROUND_COLORS[Math.abs(hash) % AVATAR_BACKGROUND_COLORS.length]!;
}

export function createAvatarSeed(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `avatar-${Date.now()}`;
}

export function avatarFilenameForSeed(seed: string): string {
  return `avatar-${seed.slice(0, 8)}.png`;
}

/** DiceBear PNG URL — fetched as blob and uploaded like a normal photo (stored on your CDN). */
export function buildAvatarPngUrl(options: GenerateAvatarOptions = {}): string {
  const seed = options.seed ?? createAvatarSeed();
  const size = options.size ?? DEFAULT_AVATAR_SIZE;
  const backgroundColor = pickBackgroundForSeed(seed);

  const params = new URLSearchParams({
    seed,
    size: String(size),
    backgroundColor,
    backgroundType: "gradientLinear",
  });

  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${AVATAR_STYLE}/png?${params.toString()}`;
}

export async function fetchAvatarPng(options: GenerateAvatarOptions = {}): Promise<{
  blob: Blob;
  seed: string;
  filename: string;
}> {
  const seed = options.seed ?? createAvatarSeed();
  const response = await fetch(buildAvatarPngUrl({ ...options, seed }));

  if (!response.ok) {
    throw new Error("AVATAR_GENERATION_FAILED");
  }

  const blob = await response.blob();
  return { blob, seed, filename: avatarFilenameForSeed(seed) };
}

export async function fetchAvatarFile(options: GenerateAvatarOptions = {}): Promise<{
  file: File;
  seed: string;
}> {
  const { blob, seed, filename } = await fetchAvatarPng(options);
  return { file: new File([blob], filename, { type: "image/png" }), seed };
}
