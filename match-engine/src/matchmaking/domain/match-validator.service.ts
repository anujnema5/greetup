import type { SnapshotUserProfile } from "@/contracts/matchmaking.contracts";

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

const normalize = (value: string): string => value.trim().toLowerCase();

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const parsed = toString(item);
    if (parsed) out.push(parsed);
  }
  return out;
};

const hasAnyOverlap = (left: string[], right: string[]): boolean => {
  if (left.length === 0 || right.length === 0) return false;
  const rightSet = new Set(right.map(normalize));
  return left.some((item) => rightSet.has(normalize(item)));
};

export class MatchValidatorService {
  accepts(
    requesterFilters: Record<string, unknown>,
    candidateAttributes: Record<string, unknown>,
  ): boolean {
    const minAge = toNumber(requesterFilters.minAge);
    const maxAge = toNumber(requesterFilters.maxAge);
    const candidateAge = toNumber(candidateAttributes.age);
    if (candidateAge !== null) {
      if (minAge !== null && candidateAge < minAge) return false;
      if (maxAge !== null && candidateAge > maxAge) return false;
    }

    const distancePreference = toString(requesterFilters.distancePreference);
    const requesterCity = toString(requesterFilters.city);
    const requesterRegion = toString(requesterFilters.region);
    const requesterCountryCode = toString(requesterFilters.countryCode);
    const candidateCity = toString(candidateAttributes.city);
    const candidateRegion = toString(candidateAttributes.region);
    const candidateCountryCode = toString(candidateAttributes.countryCode);

    if (distancePreference) {
      const normalizedDistance = normalize(distancePreference);
      if (normalizedDistance === "same_city") {
        if (!requesterCity || !candidateCity || normalize(requesterCity) !== normalize(candidateCity)) {
          return false;
        }
      } else if (normalizedDistance === "same_region") {
        if (!requesterRegion || !candidateRegion || normalize(requesterRegion) !== normalize(candidateRegion)) {
          return false;
        }
      } else if (normalizedDistance === "same_country") {
        if (
          !requesterCountryCode ||
          !candidateCountryCode ||
          normalize(requesterCountryCode) !== normalize(candidateCountryCode)
        ) {
          return false;
        }
      }
    }

    const preferredConnectionTypes = toStringArray(requesterFilters.connectionTypeIds);
    const candidateConnectionTypes = toStringArray(candidateAttributes.connectionTypeIds);
    if (preferredConnectionTypes.length > 0) {
      if (!hasAnyOverlap(preferredConnectionTypes, candidateConnectionTypes)) {
        return false;
      }
    }

    return true;
  }

  isBidirectionallyCompatible(a: SnapshotUserProfile, b: SnapshotUserProfile): boolean {
    const aAcceptsB = this.accepts(a.filters, b.attributes);
    const bAcceptsA = this.accepts(b.filters, a.attributes);
    return aAcceptsB && bAcceptsA;
  }
}
