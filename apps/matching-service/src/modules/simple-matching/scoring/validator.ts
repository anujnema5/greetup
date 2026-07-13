import type { SnapshotUserProfile } from "@/modules/simple-matching/types";

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

    // Location preferences (same city / country / global) are applied only in scoring —
    // soft penalties and global "foreign boost" — so small pools still get candidates.
    return true;
  }

  isBidirectionallyCompatible(a: SnapshotUserProfile, b: SnapshotUserProfile): boolean {
    const aAcceptsB = this.accepts(a.filters, b.attributes);
    const bAcceptsA = this.accepts(b.filters, a.attributes);
    return aAcceptsB && bAcceptsA;
  }
}
