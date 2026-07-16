import { describe, expect, it } from "bun:test";

import { digitsOnlyOtp, isValidE164, normalizeE164 } from "./otp-format";

describe("digitsOnlyOtp", () => {
  it("strips non-digits", () => {
    expect(digitsOnlyOtp("1 2-3 4_5 6")).toBe("123456");
    expect(digitsOnlyOtp("abc042915xyz")).toBe("042915");
  });
});

describe("isValidE164", () => {
  it("accepts valid E.164 numbers", () => {
    expect(isValidE164("+14155550100")).toBe(true);
    expect(isValidE164("+919812345678")).toBe(true);
  });

  it("rejects malformed numbers", () => {
    expect(isValidE164("14155550100")).toBe(false); // no leading +
    expect(isValidE164("+0155550100")).toBe(false); // leading 0 country code
    expect(isValidE164("+1")).toBe(false); // too short
    expect(isValidE164("+1415555010012345")).toBe(false); // too long (>15 digits)
    expect(isValidE164("+1-415-555")).toBe(false); // non-digits
  });
});

describe("normalizeE164", () => {
  it("strips formatting and keeps valid numbers", () => {
    expect(normalizeE164(" +1 (415) 555-0100 ")).toBe("+14155550100");
  });

  it("converts a 00 international prefix to +", () => {
    expect(normalizeE164("00919812345678")).toBe("+919812345678");
  });

  it("returns null for numbers that are not valid E.164", () => {
    expect(normalizeE164("5550100")).toBeNull();
    expect(normalizeE164("hello")).toBeNull();
  });
});
