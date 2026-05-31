/** Card backgrounds for niche tiles (cycles when there are more niches than presets). */
export const NICHE_CARD_GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-pink-500 to-rose-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-red-500 to-rose-700",
] as const;

export function nicheCardGradient(index: number): string {
  return NICHE_CARD_GRADIENTS[index % NICHE_CARD_GRADIENTS.length] ?? NICHE_CARD_GRADIENTS[0];
}
