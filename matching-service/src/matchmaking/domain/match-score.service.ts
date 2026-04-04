import { MATCH_SCORE_CONFIG } from "@/config/constants";
import type { SnapshotUserProfile } from "@/contracts/matchmaking.contracts";

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
  requester: { city: string | null; region: string | null; countryCode: string | null },
  candidate: { city: string | null; region: string | null; countryCode: string | null },
): number => {
  if (!preference || normalize(preference) === "random") return 1;

  const same = (a: string | null, b: string | null): boolean =>
    Boolean(a && b && normalize(a) === normalize(b));

  const p = normalize(preference);
  if (p === "same_city") return same(requester.city, candidate.city) ? 1 : 0;
  if (p === "same_region") return same(requester.region, candidate.region) ? 1 : 0;
  if (p === "same_country") return same(requester.countryCode, candidate.countryCode) ? 1 : 0;
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
    const requesterCity = toString(requester.filters.city);
    const requesterRegion = toString(requester.filters.region);
    const requesterCountry = toString(requester.filters.countryCode);
    const candidateCity = toString(candidate.attributes.city);
    const candidateRegion = toString(candidate.attributes.region);
    const candidateCountry = toString(candidate.attributes.countryCode);

    const candidateTrustScore = toNumber(candidate.attributes.trustScore);
    const preferredGender = toString(requester.filters.preferredGender);
    const candidateGender = toString(candidate.attributes.gender);

    const weightedTotal =
      overlapRatio(requesterInterests, candidateInterests) * weights.interests +
      overlapRatio(requesterGoals, candidateGoals) * weights.goals +
      overlapRatio(requesterProfessions, candidateProfessions) * weights.professions +
      ageScore(minAge, maxAge, candidateAge) * weights.agePreference +
      distanceScore(
        distancePreference,
        { city: requesterCity, region: requesterRegion, countryCode: requesterCountry },
        { city: candidateCity, region: candidateRegion, countryCode: candidateCountry },
      ) *
        weights.distancePreference +
      genderPreferenceScore(preferredGender, candidateGender) * weights.preferredGender +
      trustScore(candidateTrustScore) * weights.trustScore;

    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) return 0;
    return (weightedTotal / totalWeight) * 100;
  }
}
