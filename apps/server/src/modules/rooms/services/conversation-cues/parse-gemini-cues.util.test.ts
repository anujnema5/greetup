import { describe, expect, it } from "bun:test";

import { parseGeminiCuesResponse } from "@/modules/rooms/services/conversation-cues/parse-gemini-cues.util";

describe("parseGeminiCuesResponse", () => {
  it("parses a valid JSON cues payload", () => {
    const cues = parseGeminiCuesResponse(`{
      "cues": [
        {
          "id": "shared_play_chess",
          "kind": "shared_session_activity",
          "priority": 95,
          "title": "You both selected Play chess",
          "body": "Easy icebreaker once you've said hi.",
          "emoji": "♟️"
        }
      ]
    }`);

    expect(cues).toHaveLength(1);
    expect(cues[0]?.id).toBe("shared_play_chess");
    expect(cues[0]?.title).toContain("chess");
  });

  it("strips markdown fences and dedupes ids", () => {
    const cues = parseGeminiCuesResponse(`
\`\`\`json
{
  "cues": [
    { "id": "a", "title": "First", "priority": 10 },
    { "id": "a", "title": "Duplicate", "priority": 20 }
  ]
}
\`\`\``);

    expect(cues).toHaveLength(1);
    expect(cues[0]?.title).toBe("First");
  });
});
