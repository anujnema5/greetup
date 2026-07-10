import { describe, expect, it } from "bun:test";

import { HTTP_RATE_LIMITS } from "./limits";

describe("HTTP_RATE_LIMITS", () => {
  it("defines positive limits and windows for every bucket", () => {
    for (const [name, policy] of Object.entries(HTTP_RATE_LIMITS)) {
      expect(policy.limit, name).toBeGreaterThan(0);
      expect(policy.windowSec, name).toBeGreaterThan(0);
    }
  });
});
