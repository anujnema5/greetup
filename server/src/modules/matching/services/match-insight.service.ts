import { getGeminiClient } from "@/core/ai";
import logger from "@/core/logging";

type ProfileSnapshot = {
  displayName: string;
  bio?: string;
  age?: number;
  interests: string[];
  goals: string[];
  professions: string[];
  lookingFor?: string[];
  moods?: string[];
};

function buildPrompt(me: ProfileSnapshot, peer: ProfileSnapshot): string {
  const format = (arr: string[] | undefined) => arr?.length ? arr.join(", ") : "none";

  const angles = [
    "lead with what they do or are building",
    "lead with what they want right now from this conversation",
    "lead with their current mood or energy",
    "lead with their age combined with what they are doing or want",
    "lead with one specific interest, stated plainly",
  ];
  const randomAngle = angles[Math.floor(Math.random() * angles.length)];

  return `You are writing a one-line blurb shown to someone right before they connect with a peer on a social app.

PEER:
- Age: ${peer.age ?? "unknown"}
- Profession: ${format(peer.professions)}
- Interests: ${format(peer.interests)}
- Goals: ${format(peer.goals)}
- Currently looking for: ${format(peer.lookingFor)}
- Mood: ${format(peer.moods)}
${peer.bio ? `- Bio: ${peer.bio}` : ""}

READER:
- Profession: ${format(me.professions)}
- Interests: ${format(me.interests)}
- Goals: ${format(me.goals)}

YOUR ANGLE FOR THIS BLURB: ${randomAngle}

INSTRUCTIONS:

Pick exactly one signal that is clearly present in the data above. Stop at the first that works:
1. Bio has something concrete — a named place, project, role, or event.
2. Profession + goal point in clearly different directions. State both plainly.
3. What they want right now (looking for) combined with their profession or age.
4. Their mood combined with their profession or what they want.
5. One interest or goal — the most specific one available.

Write the blurb:
- Sound like a mutual friend giving a casual heads-up before an intro.
- Plain and direct. Slightly warm. Not a tagline, not a bio summary.
- Add one emoji only if it fits naturally — place it at the end, never force it.
- Never use: "passionate", "loves", "interested in", "they like", "looking for".
- Never imply contrast or tension between two signals unless the data explicitly shows it.
- Only state what is directly in the data. Do not read between the lines.
- One signal only. Do not mention the reader unless they share the exact same signal.
- Vary sentence structure. Do not start with the same word pattern every time.
- The blurb should make the reader mildly curious — not hyped, just "oh interesting".
- Maximum 12 words.

EXAMPLES (tone to aim for — do not copy content):
BAD → "Entrepreneur who loves photography and is into sports."
BAD → "Both of you are into technology."
BAD → "A creative soul exploring the world through a lens."
BAD → "Engineer but secretly obsessed with painting." ← invented contrast
BAD → "Fitness guy who surprisingly codes for fun." ← invented contrast

GOOD → "Young entrepreneur, here for advice and real talk. 🤝"
GOOD → "19, building something, just wants good conversations."
GOOD → "Chill mood, into photography, not here to network."
GOOD → "Wants advice — not connections. Refreshing, honestly."
GOOD → "Into sports and films, just here to meet people."
GOOD → "Entrepreneur at 19, still figuring out the direction. 👀"`;
}

export async function generateMatchInsight(
  me: ProfileSnapshot,
  peer: ProfileSnapshot,
): Promise<string | null> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: "gemini-flash-lite-latest" });
    const prompt = buildPrompt(me, peer);
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text || null;
  } catch (err) {
    logger.warn("[generateMatchInsight] failed, skipping insight", { err });
    return null;
  }
}

export type { ProfileSnapshot as InsightProfileSnapshot };
