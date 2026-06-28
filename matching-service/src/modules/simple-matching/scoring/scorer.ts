import { MATCH_SCORE_CONFIG } from "@/shared/config/constants";
import type { SnapshotUserProfile } from "@/modules/simple-matching/types";
import { canonicalDistancePreference } from "@/modules/simple-matching/scoring/location";
import { sessionActivityOverlapScore } from "@/modules/simple-matching/scoring/activity-intent";

/** Aligns with DB enum `connection_preference` and match-prep UI. */
const CONNECTION_PREF = {
  OPEN_TO_ANYONE: "open_to_anyone",
  SAME_PROFESSION: "same_profession",
  DIFFERENT_PROFESSION: "different_profession",
} as const;

/** Tunables for `same_profession` / `different_profession` scoring when overlap is ambiguous. */
const CONNECTION_PREF_SCORE = {
  SAME_MIN_WHEN_OVERLAP: 0.35,
  SAME_WHEN_NO_OVERLAP: 0.15,
} as const;

const normalize = (value: string): string => value.trim().toLowerCase();

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const parsed = toString(item);
    if (parsed) out.push(parsed);
  }
  return out;
};

const overlapRatio = (left: string[], right: string[]): number => {
  if (left.length === 0 || right.length === 0) return 0;
  const leftSet = new Set(left.map(normalize));
  const rightSet = new Set(right.map(normalize));
  let intersection = 0;
  for (const item of leftSet) {
    if (rightSet.has(item)) intersection += 1;
  }
  const unionSize = new Set([...leftSet, ...rightSet]).size;
  if (unionSize === 0) return 0;
  return intersection / unionSize;
};

const ageScore = (minAge: number | null, maxAge: number | null, candidateAge: number | null): number => {
  if (candidateAge === null) return 0.5;
  if (minAge === null && maxAge === null) return 1;

  const lower = minAge ?? 18;
  const upper = maxAge ?? 99;
  if (candidateAge >= lower && candidateAge <= upper) return 1;

  const distanceFromRange =
    candidateAge < lower ? lower - candidateAge : candidateAge > upper ? candidateAge - upper : 0;

  // Degrade score up to 10 years outside preferred range.
  const clamped = Math.min(distanceFromRange / 10, 1);
  return Math.max(0, 1 - clamped);
};

const distanceScore = (
  preference: string | null,
  locationPreferenceEnabled: boolean | undefined,
  requester: { city: string | null; region: string | null; countryCode: string | null },
  candidate: { city: string | null; region: string | null; countryCode: string | null },
): number => {
  if (locationPreferenceEnabled !== true) return 1;

  const tuning = MATCH_SCORE_CONFIG.distanceScoreTuning;
  const canonicalPreference = canonicalDistancePreference(preference);
  if (!canonicalPreference || canonicalPreference === "random") {
    return 1;
  }

  const same = (a: string | null, b: string | null): boolean =>
    Boolean(a && b && normalize(a) === normalize(b));

  if (canonicalPreference === "global") {
    const rc = requester.countryCode;
    const cc = candidate.countryCode;
    if (!rc || !cc) return tuning.globalIncomplete;
    return same(rc, cc) ? tuning.globalSameCountry : tuning.globalForeign;
  }

  if (canonicalPreference === "same_city") {
    return same(requester.city, candidate.city) ? 1 : tuning.sameCityMismatch;
  }
  if (canonicalPreference === "same_region") {
    return same(requester.region, candidate.region) ? 1 : tuning.sameRegionMismatch;
  }
  if (canonicalPreference === "same_country") {
    return same(requester.countryCode, candidate.countryCode) ? 1 : tuning.sameCountryMismatch;
  }
  return 0.5;
};

const trustScore = (value: number | null): number => {
  if (value === null) return 0.5;
  return Math.min(Math.max(value, 0), 100) / 100;
};

const genderPreferenceScore = (preferredGender: string | null, candidateGender: string | null): number => {
  if (!preferredGender || normalize(preferredGender) === "any") return 1;
  if (!candidateGender) return 0.5;
  return normalize(preferredGender) === normalize(candidateGender) ? 1 : 0;
};

/**
 * Jaccard overlap on session mood / "looking for" ids.
 * Both empty → neutral 1; one side empty → 0.5; else Jaccard.
 */
const sessionOverlapComponent = (left: string[], right: string[]): number => {
  if (left.length === 0 && right.length === 0) return 1;
  if (left.length === 0 || right.length === 0) return 0.5;
  return overlapRatio(left, right);
};

type ScoreWeights = (typeof MATCH_SCORE_CONFIG)["weights"];

/**
 * Match-prep weights apply only when the requester set that signal (avoids inflating scores for users who skipped prep).
 */
const activeMatchPrepWeights = (
  weights: ScoreWeights,
  requesterMoods: string[],
  requesterLookingFor: string[],
  requesterConnectionPref: string | null,
  requesterActivityIds: string[],
): {
  mood: number;
  lookingFor: number;
  connectionPreference: number;
  sessionActivities: number;
  sessionActivityDetail: number;
} => {
  const pref =
    requesterConnectionPref?.trim() ? normalize(requesterConnectionPref) : CONNECTION_PREF.OPEN_TO_ANYONE;
  return {
    mood: requesterMoods.length > 0 ? weights.sessionMoods : 0,
    lookingFor: requesterLookingFor.length > 0 ? weights.sessionLookingFor : 0,
    connectionPreference:
      pref && pref !== CONNECTION_PREF.OPEN_TO_ANYONE ? weights.connectionPreference : 0,
    sessionActivities: requesterActivityIds.length > 0 ? weights.sessionActivities : 0,
    sessionActivityDetail: requesterActivityIds.length > 0 ? weights.sessionActivityDetail : 0,
  };
};

/**
 * How well the candidate fits the requester's "who to prioritize" vs profession overlap.
 * `open_to_anyone` → neutral. `same_profession` → reward overlap. `different_profession` → reward low overlap.
 */
const connectionPreferenceDirectionalScore = (
  requesterPref: string | null,
  requesterProfessions: string[],
  candidateProfessions: string[],
): number => {
  const p = requesterPref?.trim() ? normalize(requesterPref) : CONNECTION_PREF.OPEN_TO_ANYONE;
  if (p === CONNECTION_PREF.OPEN_TO_ANYONE) return 1;
  const profOverlap = overlapRatio(requesterProfessions, candidateProfessions);
  if (p === CONNECTION_PREF.SAME_PROFESSION) {
    if (requesterProfessions.length === 0 || candidateProfessions.length === 0) return 0.5;
    return profOverlap > 0
      ? Math.max(CONNECTION_PREF_SCORE.SAME_MIN_WHEN_OVERLAP, profOverlap)
      : CONNECTION_PREF_SCORE.SAME_WHEN_NO_OVERLAP;
  }
  if (p === CONNECTION_PREF.DIFFERENT_PROFESSION) {
    if (requesterProfessions.length === 0 || candidateProfessions.length === 0) return 0.5;
    return 1 - profOverlap;
  }
  return 1;
};

export class MatchScoreService {
  calculateBidirectionalScore(a: SnapshotUserProfile, b: SnapshotUserProfile): number {
    const aToB = this.calculateDirectionalScore(a, b);
    const bToA = this.calculateDirectionalScore(b, a);
    const finalScore = (aToB + bToA) / 2;
    return Math.round(finalScore);
  }

  isScoreEligible(score: number): boolean {
    return score >= MATCH_SCORE_CONFIG.minScoreToMatch;
  }

  private calculateDirectionalScore(
    requester: SnapshotUserProfile,
    candidate: SnapshotUserProfile,
  ): number {
    const weights = MATCH_SCORE_CONFIG.weights;

    const requesterInterests = toStringArray(requester.attributes.interestIds);
    const candidateInterests = toStringArray(candidate.attributes.interestIds);
    const requesterGoals = toStringArray(requester.attributes.goalIds);
    const candidateGoals = toStringArray(candidate.attributes.goalIds);
    const requesterProfessions = toStringArray(requester.attributes.professionIds);
    const candidateProfessions = toStringArray(candidate.attributes.professionIds);

    const minAge = toNumber(requester.filters.minAge);
    const maxAge = toNumber(requester.filters.maxAge);
    const candidateAge = toNumber(candidate.attributes.age);

    const distancePreference = toString(requester.filters.distancePreference);
    const locPrefEnabled = requester.filters.locationPreferenceEnabled === true;
    const requesterCity = toString(requester.filters.city);
    const requesterRegion = toString(requester.filters.region);
    const requesterCountry = toString(requester.filters.countryCode);
    const candidateCity = toString(candidate.attributes.city);
    const candidateRegion = toString(candidate.attributes.region);
    const candidateCountry = toString(candidate.attributes.countryCode);

    const candidateTrustScore = toNumber(candidate.attributes.trustScore);
    const preferredGender = toString(requester.filters.preferredGender);
    const candidateGender = toString(candidate.attributes.gender);

    const requesterMoods = toStringArray(requester.attributes.sessionMoodIds);
    const candidateMoods = toStringArray(candidate.attributes.sessionMoodIds);
    const requesterSessionLf = toStringArray(requester.attributes.sessionLookingForIds);
    const candidateSessionLf = toStringArray(candidate.attributes.sessionLookingForIds);
    const requesterConnPref = toString(requester.attributes.connectionPreference);
    const requesterActivityIds = toStringArray(requester.attributes.sessionActivityIds);

    const prep = activeMatchPrepWeights(
      weights,
      requesterMoods,
      requesterSessionLf,
      requesterConnPref,
      requesterActivityIds,
    );

    const activityScore = sessionActivityOverlapScore(requester, candidate);

    const weightedTotal =
      overlapRatio(requesterInterests, candidateInterests) * weights.interests +
      overlapRatio(requesterGoals, candidateGoals) * weights.goals +
      overlapRatio(requesterProfessions, candidateProfessions) * weights.professions +
      ageScore(minAge, maxAge, candidateAge) * weights.agePreference +
      distanceScore(
        distancePreference,
        locPrefEnabled,
        { city: requesterCity, region: requesterRegion, countryCode: requesterCountry },
        { city: candidateCity, region: candidateRegion, countryCode: candidateCountry },
      ) *
        weights.distancePreference +
      genderPreferenceScore(preferredGender, candidateGender) * weights.preferredGender +
      trustScore(candidateTrustScore) * weights.trustScore +
      sessionOverlapComponent(requesterMoods, candidateMoods) * prep.mood +
      sessionOverlapComponent(requesterSessionLf, candidateSessionLf) * prep.lookingFor +
      connectionPreferenceDirectionalScore(
        requesterConnPref,
        requesterProfessions,
        candidateProfessions,
      ) *
        prep.connectionPreference +
      activityScore.overlap * prep.sessionActivities +
      activityScore.detailBonus * prep.sessionActivityDetail;

    const totalWeight =
      weights.interests +
      weights.goals +
      weights.professions +
      weights.agePreference +
      weights.distancePreference +
      weights.preferredGender +
      weights.trustScore +
      prep.mood +
      prep.lookingFor +
      prep.connectionPreference +
      prep.sessionActivities +
      prep.sessionActivityDetail;
    if (totalWeight <= 0) return 0;
    return (weightedTotal / totalWeight) * 100;
  }
}
