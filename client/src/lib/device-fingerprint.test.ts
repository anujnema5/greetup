import { describe, expect, it } from "bun:test";

import {
  buildDeviceFingerprintString,
  DEVICE_FINGERPRINT_MAX_LENGTH,
} from "./device-fingerprint";

describe("device-fingerprint", () => {
  it("joins payload parts in a stable pipe-delimited format", () => {
    const value = buildDeviceFingerprintString({
      localId: "abc-123",
      userAgent: "Mozilla/5.0",
      screen: "1920x1080",
      timeZone: "America/New_York",
      language: "en-US",
    });

    expect(value).toBe("abc-123|Mozilla/5.0|1920x1080|America/New_York|en-US");
  });

  it("truncates to the server max length", () => {
    const value = buildDeviceFingerprintString({
      localId: "x".repeat(300),
      userAgent: "y".repeat(300),
      screen: "1920x1080",
      timeZone: "UTC",
      language: "en-US",
    });

    expect(value.length).toBe(DEVICE_FINGERPRINT_MAX_LENGTH);
    expect(value.endsWith("en-US")).toBe(false);
  });
});
