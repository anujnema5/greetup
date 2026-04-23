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
    locationPreferenceEnabled: true,
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
        locationPreferenceEnabled: true,
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

  it("ranks higher when requester match-prep moods overlap the candidate", () => {
    const requester = profile({
      userId: "r",
      attributes: {
        age: 25,
        gender: "female",
        countryCode: "IN",
        region: "MH",
        city: "Pune",
        interestIds: ["music"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 90,
        sessionMoodIds: ["m1", "m2"],
        sessionLookingForIds: [],
        connectionPreference: null,
      },
    });

    const overlapping = profile({
      userId: "c1",
      attributes: {
        age: 26,
        gender: "male",
        countryCode: "IN",
        region: "MH",
        city: "Pune",
        interestIds: ["music"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 90,
        sessionMoodIds: ["m1", "m3"],
        sessionLookingForIds: [],
        connectionPreference: null,
      },
    });

    const disjoint = profile({
      userId: "c2",
      attributes: {
        age: 26,
        gender: "male",
        countryCode: "IN",
        region: "MH",
        city: "Pune",
        interestIds: ["music"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 90,
        sessionMoodIds: ["x", "y"],
        sessionLookingForIds: [],
        connectionPreference: null,
      },
    });

    expect(scorer.calculateBidirectionalScore(requester, overlapping)).toBeGreaterThan(
      scorer.calculateBidirectionalScore(requester, disjoint),
    );
  });

  it("with global preference, ranks cross-border candidate above same-country candidate", () => {
    const base = profile({
      userId: "r",
      filters: {
        preferredGender: "any",
        minAge: 20,
        maxAge: 30,
        distancePreference: "global",
        locationPreferenceEnabled: true,
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
        interestIds: ["music"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 90,
      },
    });

    const sameCountry = profile({
      userId: "c-in",
      attributes: {
        age: 26,
        gender: "male",
        countryCode: "IN",
        region: "KA",
        city: "Bengaluru",
        interestIds: ["music"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 90,
      },
    });

    const foreign = profile({
      userId: "c-us",
      attributes: {
        age: 26,
        gender: "male",
        countryCode: "US",
        region: "CA",
        city: "San Francisco",
        interestIds: ["music"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 90,
      },
    });

    expect(scorer.calculateBidirectionalScore(base, foreign)).toBeGreaterThan(
      scorer.calculateBidirectionalScore(base, sameCountry),
    );
  });

  it("with same_city preference, different city lowers score but need not zero it out", () => {
    const requester = profile({
      userId: "r",
      filters: {
        preferredGender: "any",
        minAge: 20,
        maxAge: 30,
        distancePreference: "same_city",
        locationPreferenceEnabled: true,
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
        interestIds: ["music"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 90,
      },
    });

    const sameCity = profile({
      userId: "c1",
      attributes: {
        age: 26,
        gender: "male",
        countryCode: "IN",
        region: "MH",
        city: "Pune",
        interestIds: ["music"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 90,
      },
    });

    const otherCity = profile({
      userId: "c2",
      attributes: {
        age: 26,
        gender: "male",
        countryCode: "IN",
        region: "MH",
        city: "Mumbai",
        interestIds: ["music"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 90,
      },
    });

    const perfect = scorer.calculateBidirectionalScore(requester, sameCity);
    const softer = scorer.calculateBidirectionalScore(requester, otherCity);
    expect(perfect).toBeGreaterThan(softer);
    expect(softer).toBeGreaterThan(0);
  });

  it("when locationPreferenceEnabled is false, distancePreference does not penalize mismatched city", () => {
    const locOn = profile({
      userId: "a-on",
      filters: {
        preferredGender: "any",
        minAge: 20,
        maxAge: 30,
        distancePreference: "same_city",
        locationPreferenceEnabled: true,
        countryCode: "IN",
        region: "MH",
        city: "Pune",
      },
    });
    const locOff = profile({
      userId: "a-off",
      filters: {
        preferredGender: "any",
        minAge: 20,
        maxAge: 30,
        distancePreference: "same_city",
        locationPreferenceEnabled: false,
        countryCode: "IN",
        region: "MH",
        city: "Pune",
      },
    });
    const otherCityCandidate = profile({
      userId: "b",
      attributes: {
        age: 26,
        gender: "male",
        countryCode: "IN",
        region: "MH",
        city: "Mumbai",
        interestIds: ["music", "books"],
        goalIds: ["friends"],
        professionIds: ["eng"],
        trustScore: 95,
      },
    });

    expect(scorer.calculateBidirectionalScore(locOff, otherCityCandidate)).toBeGreaterThan(
      scorer.calculateBidirectionalScore(locOn, otherCityCandidate),
    );
  });
});
