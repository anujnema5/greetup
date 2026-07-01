import { getGeminiClient } from "@/core/ai";
import logger from "@/core/logging";
import type { ConversationCueDto } from "@/modules/rooms/services/conversation-cues/conversation-cues.types";
import { parseGeminiCuesResponse } from "@/modules/rooms/services/conversation-cues/parse-gemini-cues.util";
import type { ProfileSnapshotContext } from "@/modules/rooms/services/conversation-cues/parse-profile-snapshot.util";

const GEMINI_MODEL = "gemini-flash-lite-latest";
const MAX_CUES_REQUESTED = 8;

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "none";
}

function formatSessionActivities(
  rows: ProfileSnapshotContext["sessionActivities"],
): string {
  if (rows.length === 0) return "none";
  return rows
    .map((row) => {
      const detail = row.detail ? ` (${row.detail})` : "";
      const emoji = row.emoji ? `${row.emoji} ` : "";
      return `${emoji}${row.label}${detail}`;
    })
    .join("; ");
}

function formatProfileBlock(label: string, profile: ProfileSnapshotContext): string {
  return `${label}:
- Name: ${profile.displayName}
- Age: ${profile.age ?? "unknown"}
- Bio: ${profile.bio ?? "none"}
- Profession: ${formatList(profile.professions)}
- Profile interests: ${formatList(profile.interests)}
- Goals: ${formatList(profile.goals)}
- Mood right now: ${formatList(profile.moods)}
- Looking for (conversation style): ${formatList(profile.lookingFor)}
- Session activities (what they want to do on this call): ${formatSessionActivities(profile.sessionActivities)}`;
}

function buildConversationCuesPrompt(
  me: ProfileSnapshotContext,
  peer: ProfileSnapshotContext,
  alreadyShownCueIds: string[],
): string {
  const shown =
    alreadyShownCueIds.length > 0 ? alreadyShownCueIds.join(", ") : "none";

  return `You generate short in-call conversation cues for a 1:1 video chat on a social app.
The viewer (READER) is already connected with the peer (PEER). Your cues help them start or continue conversation naturally.

${formatProfileBlock("PEER", peer)}

${formatProfileBlock("READER", me)}

ALREADY SHOWN CUE IDS (do not repeat these ids or near-duplicate wording):
${shown}

TASK:
Return up to ${MAX_CUES_REQUESTED} cues as JSON. Rank by usefulness for breaking awkward silence.
Prioritize real overlaps from the data — especially shared session activities, shared interests, matching mood, or peer-only session activities.

CUE TYPES (set "kind" accordingly):
- shared_session_activity — both picked the same session activity (e.g. chess, vent)
- shared_session_activity_detail — same activity AND same detail (e.g. both practice Spanish)
- peer_session_activity — only PEER picked a session activity
- shared_interest — same profile interest on both sides
- shared_mood — same mood right now
- shared_looking_for — same "looking for" style
- shared_goal — same goal
- ai_generated — other safe overlap or opener grounded in data

OUTPUT FORMAT (JSON only, no markdown):
{
  "cues": [
    {
      "id": "stable_slug_like_shared_play_chess",
      "kind": "shared_session_activity",
      "priority": 95,
      "title": "Short headline shown in a toast",
      "body": "Optional one-line helper under the title, or null",
      "emoji": "♟️"
    }
  ]
}

RULES:
- Only use facts present in the profile blocks above. Never invent hobbies, cities, or activities.
- "id" must be unique, lowercase slug (letters, numbers, underscore, colon). Stable per overlap type.
- "title" max 12 words. Plain, warm, direct — like a mutual friend whispering a hint.
- "body" max 20 words or null. Actionable but not pushy. Never say "invite them" or "start chess automatically".
- "emoji" optional — one emoji max, only when it fits. Can be null.
- "priority" 0–100 (higher = show first). Shared session activity with detail ≈ 95–100; shared activity ≈ 85–95; peer-only activity ≈ 70; shared mood/looking for ≈ 55–65; shared interest ≈ 45–55.
- Do not mention "profile snapshot", "data", or "AI".
- Never use: passionate, loves, interested in, vibe check, synergy.
- If there is no meaningful overlap, return 1–2 gentle openers grounded only in PEER's session activities or looking-for/mood.

EXAMPLES (tone only — do not copy if data does not support):

GOOD title/body pairs:
- title: "You both selected Play chess", body: "Easy icebreaker once you've said hi."
- title: "You both picked Language practice", body: "Same focus: Spanish."
- title: "They selected Vent", body: "They may want space to talk — lead with listening."
- title: "You're both feeling Chill", body: "No need to force high energy."
- title: "You both like Photography", body: "Simple topic if the call goes quiet."

BAD (never):
- "You'd make great friends!" (invented)
- "Talk about your favorite movies" (not in data)
- "Start a chess game now" (too pushy / automatic action)
- "Entrepreneur who loves photography" (bio-summary tone)

Return JSON only.`;
}

export async function generateConversationCuesWithGemini(
  me: ProfileSnapshotContext,
  peer: ProfileSnapshotContext,
  alreadyShownCueIds: string[],
): Promise<ConversationCueDto[]> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const prompt = buildConversationCuesPrompt(me, peer, alreadyShownCueIds);
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (!text) return [];

    const cues = parseGeminiCuesResponse(text);
    logger.info("[generateConversationCuesWithGemini] generated", {
      count: cues.length,
      alreadyShown: alreadyShownCueIds.length,
    });
    return cues;
  } catch (err) {
    logger.warn("[generateConversationCuesWithGemini] failed", { err });
    return [];
  }
}
