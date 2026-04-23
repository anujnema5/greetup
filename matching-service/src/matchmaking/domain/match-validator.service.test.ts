import { describe, expect, it } from "bun:test";
import { MatchValidatorService } from "./match-validator.service";
import type { SnapshotUserProfile } from "@/contracts/matchmaking.contracts";

const validator = new MatchValidatorService();

const profile = (overrides?: Partial<SnapshotUserProfile>): SnapshotUserProfile => ({
  userId: "u1",
  matchIds: [],
  version: 1,
  updatedAt: Date.now(),
  filters: {
    preferredGender: "any",
    minAge: 18,
    maxAge: 99,
    distancePreference: "random",
  },
  attributes: {
    age: 25,
    gender: "female",
    countryCode: "IN",
    region: "MH",
    city: "Pune",
  },
  ...overrides,
});

describe("MatchValidatorService", () => {
  it("accepts when filters are compatible", () => {
    const requester = profile({
      userId: "requester",
      filters: {
        preferredGender: "female",
        minAge: 20,
        maxAge: 30,
        distancePreference: "same_city",
        city: "Pune",
      },
    });
    const candidate = profile({ userId: "candidate" });

    const accepted = validator.accepts(requester.filters, candidate.attributes);

    expect(accepted).toBe(true);
  });

  it("does not reject when gender does not match (soft preference)", () => {
    const accepted = validator.accepts(
      { preferredGender: "male" },
      { gender: "female", age: 24 },
    );

    expect(accepted).toBe(true);
  });

  it("rejects when age is outside range", () => {
    const accepted = validator.accepts(
      { minAge: 25, maxAge: 35 },
      { age: 21, gender: "male" },
    );

    expect(accepted).toBe(false);
  });

  it("accepts when same_country preference but country differs (location is soft-scored only)", () => {
    const accepted = validator.accepts(
      { distancePreference: "same_country", countryCode: "IN" },
      { countryCode: "US", age: 22 },
    );

    expect(accepted).toBe(true);
  });

  it("checks bidirectional compatibility", () => {
    const a = profile({
      userId: "a",
      filters: {
        preferredGender: "female",
        minAge: 20,
        maxAge: 28,
        distancePreference: "same_country",
        countryCode: "IN",
      },
      attributes: {
        age: 24,
        gender: "male",
        countryCode: "IN",
      },
    });
    const b = profile({
      userId: "b",
      filters: {
        preferredGender: "male",
        minAge: 22,
        maxAge: 30,
        distancePreference: "same_country",
        countryCode: "IN",
      },
      attributes: {
        age: 26,
        gender: "female",
        countryCode: "IN",
      },
    });

    const result = validator.isBidirectionallyCompatible(a, b);
    expect(result).toBe(true);
  });
});
