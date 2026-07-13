/**
 * Score aggregator
 *
 * Converts an ordered list of 30-second window scores into a single
 * session-level result with two outputs:
 *
 *   dimensions       — weighted average per dimension across all windows
 *   intelligenceScore— single composite number (0-100)
 *
 * Recency weighting:
 *   Later windows matter more — a candidate who improves during an
 *   interview should score higher than one who starts strong and fades.
 *   Weights are generated linearly (window 1 = lowest, last = highest)
 *   and normalised so they always sum to 1.
 *
 * Dimension weights (from the architecture doc):
 *   topic_knowledge  30% — correctness of domain knowledge
 *   topic_depth      25% — ability to explain the "why"
 *   coherence        15% — logical structure and flow
 *   language_quality 15% — vocabulary, grammar, clarity
 *   confidence        8% — directness, no filler words
 *   originality       7% — novel perspectives
 */

import type { WindowScores } from './engine.ts'

const DIMENSION_WEIGHTS = {
  topic_knowledge:  0.30,
  topic_depth:      0.25,
  coherence:        0.15,
  language_quality: 0.15,
  confidence:       0.08,
  originality:      0.07,
} as const

type Dimension = keyof typeof DIMENSION_WEIGHTS

export type AggregatedScores = {
  dimensions:       Record<Dimension, number>
  intelligenceScore: number
}

export function aggregateWindows(windows: WindowScores[]): AggregatedScores {
  if (windows.length === 0) {
    const zero = Object.fromEntries(
      Object.keys(DIMENSION_WEIGHTS).map(k => [k, 0]),
    ) as Record<Dimension, number>
    return { dimensions: zero, intelligenceScore: 0 }
  }

  const windowWeights = buildWindowWeights(windows.length)

  // Weighted average per dimension across all windows
  const dimensions = {} as Record<Dimension, number>
  for (const dim of Object.keys(DIMENSION_WEIGHTS) as Dimension[]) {
    const weightedSum = windows.reduce(
      (sum, w, i) => sum + w[dim] * windowWeights[i],
      0,
    )
    // Round to one decimal place for clean display
    dimensions[dim] = Math.round(weightedSum * 10) / 10
  }

  // Single intelligence score — combine dimensions using their weights
  const intelligenceScore = Math.round(
    (Object.keys(DIMENSION_WEIGHTS) as Dimension[]).reduce(
      (sum, dim) => sum + dimensions[dim] * DIMENSION_WEIGHTS[dim],
      0,
    ) * 10,
  ) / 10

  return { dimensions, intelligenceScore }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Generates normalised recency weights for `count` windows.
 * Raw weights: [1/n, 2/n, …, n/n]. Normalised so they sum to 1.
 * Single-window edge case returns [1].
 */
function buildWindowWeights(count: number): number[] {
  if (count === 1) return [1]
  const raw   = Array.from({ length: count }, (_, i) => (i + 1) / count)
  const total = raw.reduce((a, b) => a + b, 0)
  return raw.map(w => w / total)
}
