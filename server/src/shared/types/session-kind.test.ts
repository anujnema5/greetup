import { describe, expect, it } from "bun:test";
import { isSessionKind, SESSION_KINDS } from "./session-kind";

describe("session-kind", () => {
  it("recognizes all product session kinds", () => {
    for (const kind of SESSION_KINDS) {
      expect(isSessionKind(kind)).toBe(true);
    }
  });

  it("rejects unknown strings", () => {
    expect(isSessionKind("unknown")).toBe(false);
    expect(isSessionKind(null)).toBe(false);
  });
});
