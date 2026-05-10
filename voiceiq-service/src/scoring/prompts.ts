/**
 * Claude prompt templates for VoiceIQ scoring
 *
 * Keeping prompts in their own file makes them easy to iterate on
 * without touching the API-call logic in engine.ts.
 *
 * Prompt caching note:
 *   The system prompt (role definition) is marked `cache_control: ephemeral`
 *   in engine.ts — it stays cached for up to 5 minutes across calls,
 *   saving ~95% of input-token cost on the stable system turn.
 */

// ─── Per-window scoring prompt ────────────────────────────────────────────────
//
// Called every 30 seconds per participant.
// Placeholders: {topic} {rubric_name} {rubric_context} {transcript}

export const SCORING_PROMPT = `\
You are an expert evaluator assessing a speaker in a live session.

Session topic: {topic}
Rubric: {rubric_name}
{rubric_context}

Candidate transcript (last 30 seconds):
"{transcript}"

Score strictly from 0 to 100.
  - 70  = genuinely good
  - 90+ = only for truly exceptional responses
  - Be honest — lenient scoring makes the tool useless

Return ONLY valid JSON, no other text:
{
  "topic_knowledge":  <number>,
  "topic_depth":      <number>,
  "coherence":        <number>,
  "language_quality": <number>,
  "confidence":       <number>,
  "originality":      <number>,
  "reasoning":        "<one sentence explaining these scores>"
}`

// ─── End-of-session feedback prompt ──────────────────────────────────────────
//
// Called once when a session ends.
// Placeholders: {full_transcript} {scores} {weak_areas} {topic}

export const FEEDBACK_PROMPT = `\
You are an expert communication coach giving post-session feedback.

Full transcript:
{full_transcript}

Final scores: {scores}
Weak areas (score < 65): {weak_areas}
Session topic: {topic}

Rules — follow strictly:
1. NEVER suggest an exact sentence the candidate "should have said"
2. Describe the PATTERN causing the weakness, not the specific words used
3. Give ONE named technique or framework per improvement point
4. Be specific to what THIS candidate said — no generic advice
5. Maximum 3 improvement points, ordered by impact
6. Start with one genuine strength

Return ONLY valid JSON, no other text:
{
  "strength": "<specific thing they did well>",
  "improvements": [
    {
      "area":        "<dimension key>",
      "observation": "<pattern you noticed in their speech>",
      "technique":   "<named technique or framework to fix it>",
      "drill":       "<short at-home practice exercise>"
    }
  ],
  "summary": "<2 sentences: overall communication style read>"
}`
