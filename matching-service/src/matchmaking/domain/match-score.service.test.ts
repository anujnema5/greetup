import { describe, expect, it } from "bun:test";
import type { SnapshotUserProfile } from "@/contracts/matchmaking.contracts";
import { MatchScoreService } from "./match-score.service";

const scorer = new MatchScoreService();

const profile = (overrides?: Partial<SnapshotUserProfile>): SnapshotUserProfile => ({
  userId: "u1",
  matchIds: ["interest:music", "goal:friends"],
  version: 1,
  updatedAt: Date.now(),
  filters: {
    preferredGender: "any",
    minAge: 20,
    maxAge: 30,
    distancePreference: "same_city",
    countryCode: "IN",
    region: "MH",
    city: "Pune",
  },
  attributes: {
    age: 25,
    gender: "female",
    countryCode: "IN",
    region: "MH",
    city: "Pune",
    interestIds: ["music", "books"],
    goalIds: ["friends"],
    professionIds: ["eng"],
    trustScore: 90,
  },
  ...overrides,
});

describe("MatchScoreService", () => {
  it("gives high score for strong overlap", () => {
    const a = profile({ userId: "a" });
    const b = profile({
      userId: "b",
      attributes: {
        age: 26,
        gender: "male",
        countryCode: "IN",
        region: "MH",
        city: "Pune",
        interestIds: ["music", "books"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 95,
      },
    });

    const score = scorer.calculateBidirectionalScore(a, b);
    expect(score).toBeGreaterThan(80);
    expect(scorer.isScoreEligible(score)).toBe(true);
  });

  it("gives low score for weak overlap and far preferences", () => {
    const a = profile({ userId: "a" });
    const b = profile({
      userId: "b",
      attributes: {
        age: 44,
        gender: "male",
        countryCode: "US",
        region: "CA",
        city: "San Francisco",
        interestIds: ["gaming"],
        goalIds: ["career"],
        professionIds: ["law"],
        trustScore: 20,
      },
    });

    const score = scorer.calculateBidirectionalScore(a, b);
    expect(score).toBeLessThan(35);
    expect(scorer.isScoreEligible(score)).toBe(false);
  });

  it("boosts score when preferred gender matches", () => {
    const requester = profile({
      userId: "requester",
      filters: {
        preferredGender: "female",
        minAge: 20,
        maxAge: 30,
        distancePreference: "same_city",
        countryCode: "IN",
        region: "MH",
        city: "Pune",
      },
    });

    const matchingGenderCandidate = profile({
      userId: "c1",
      attributes: {
        age: 26,
        gender: "female",
        countryCode: "IN",
        region: "MH",
        city: "Pune",
        interestIds: ["music", "books"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 90,
      },
    });

    const nonMatchingGenderCandidate = profile({
      userId: "c2",
      attributes: {
        age: 26,
        gender: "male",
        countryCode: "IN",
        region: "MH",
        city: "Pune",
        interestIds: ["music", "books"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 90,
      },
    });

    const scoreWithMatch = scorer.calculateBidirectionalScore(requester, matchingGenderCandidate);
    const scoreWithoutMatch = scorer.calculateBidirectionalScore(requester, nonMatchingGenderCandidate);

    expect(scoreWithMatch).toBeGreaterThan(scoreWithoutMatch);
  });
});
