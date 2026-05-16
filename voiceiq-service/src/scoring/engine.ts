/**
 * Scoring engine — Claude API integration
 *
 * Two functions, each making one Claude API call:
 *
 *   scoreWindow()      — called every 30 seconds per participant
 *                        scores 6 dimensions (0-100) + one-sentence reasoning
 *
 *   generateFeedback() — called once at session end
 *                        returns a structured coaching report
 *
 * Prompt caching:
 *   The system prompt is marked `cache_control: ephemeral` on both calls.
 *   It is stable across calls within a 5-minute window, so Claude caches it —
 *   saving ~95% of input tokens on the system turn. This is important because
 *   scoreWindow() fires every 30 s across many concurrent sessions.
 */

import Anthropic from '@anthropic-ai/sdk'
import config from '@/shared/config/config.ts'
import { SCORING_PROMPT, FEEDBACK_PROMPT } from './prompts.ts'

const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey })

// ─── Shared types ─────────────────────────────────────────────────────────────

export type WindowScores = {
  topic_knowledge:  number
  topic_depth:      number
  coherence:        number
  language_quality: number
  confidence:       number
  originality:      number
  reasoning:        string
}

export type FeedbackReport = {
  strength:     string
  improvements: Array<{
    area:        string
    observation: string
    technique:   string
    drill:       string
  }>
  summary: string
}

export type RubricDefinition = {
  name:     string
  context?: string
}

// ─── Per-window scoring ───────────────────────────────────────────────────────

export async function scoreWindow(
  transcript: string,
  rubric:     RubricDefinition,
  topic:      string,
): Promise<WindowScores> {
  const userPrompt = SCORING_PROMPT
    .replace('{topic}',          topic)
    .replace('{rubric_name}',    rubric.name)
    .replace('{rubric_context}', rubric.context ? `Context: ${rubric.context}` : '')
    .replace('{transcript}',     transcript)

  const response = await anthropic.messages.create({
    model:      config.anthropic.scoringModel,
    max_tokens: 512,
    system: [
      {
        type:          'text',
        text:          'You are an expert speech and communication evaluator. Return only valid JSON.',
        cache_control: { type: 'ephemeral' }, // cached for 5 min — saves ~95% input tokens
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(text) as WindowScores
}

// ─── End-of-session feedback ──────────────────────────────────────────────────

export async function generateFeedback(
  fullTranscript: string,
  finalScores:    Record<string, number>,
  topic:          string,
): Promise<FeedbackReport> {
  const weakAreas = Object.entries(finalScores)
    .filter(([, score]) => score < 65)
    .map(([area]) => area)
    .join(', ') || 'none'

  const userPrompt = FEEDBACK_PROMPT
    .replace('{full_transcript}', fullTranscript)
    .replace('{scores}',          JSON.stringify(finalScores))
    .replace('{weak_areas}',      weakAreas)
    .replace('{topic}',           topic)

  const response = await anthropic.messages.create({
    model:      config.anthropic.feedbackModel,
    max_tokens: 1_024,
    system: [
      {
        type:          'text',
        text:          'You are an expert communication coach. Return only valid JSON.',
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(text) as FeedbackReport
}
