import { describe, expect, it } from "bun:test";

import { isGuestAllowedProfileRequest } from "./guest-allowed-profile-routes";

describe("isGuestAllowedProfileRequest", () => {
  it("allows GET match-prep options and current on profile mount paths", () => {
    expect(isGuestAllowedProfileRequest("GET", "/profile/match-prep/options")).toBe(true);
    expect(isGuestAllowedProfileRequest("GET", "/api/profile/match-prep/options")).toBe(true);
    expect(isGuestAllowedProfileRequest("GET", "/profile/match-prep/current")).toBe(true);
    expect(isGuestAllowedProfileRequest("GET", "/api/profile/match-prep/current")).toBe(true);
  });

  it("blocks other profile routes and methods", () => {
    expect(isGuestAllowedProfileRequest("GET", "/profile/me")).toBe(false);
    expect(isGuestAllowedProfileRequest("POST", "/profile/match-prep/options")).toBe(false);
  });
});
