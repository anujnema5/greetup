import { describe, expect, it } from "bun:test";

import {
  isPlaceholderUsername,
  isValidUsernameFormat,
  slugifyUsernameToken,
} from "./username";

describe("username lib", () => {
  it("detects placeholder usernames", () => {
    expect(isPlaceholderUsername("")).toBe(true);
    expect(isPlaceholderUsername("guest_abc")).toBe(true);
    expect(isPlaceholderUsername("gabcdef012345678901234")).toBe(true);
    expect(isPlaceholderUsername("quiet_listener")).toBe(false);
  });

  it("validates username format", () => {
    expect(isValidUsernameFormat("ab")).toBe(false);
    expect(isValidUsernameFormat("quiet_listener")).toBe(true);
    expect(isValidUsernameFormat("bad-handle")).toBe(false);
  });

  it("slugifies interest tokens", () => {
    expect(slugifyUsernameToken("Board Games")).toBe("board_games");
    expect(slugifyUsernameToken("  Chess!! ")).toBe("chess");
  });
});
