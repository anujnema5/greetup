import { describe, expect, it } from "bun:test";
import type { ScoredMatchCandidate } from "@/modules/simple-matching/types";
import { partitionDeprioritizedCandidates, rankCandidatesForPairing } from "@/modules/simple-matching/helpers";
const candidate = (userId: string, matchScore: number): ScoredMatchCandidate => ({
  userId,
  matchScore,
  poolScore: 0,
});

describe("partitionDeprioritizedCandidates", () => {
  it("returns candidates unchanged when no deprioritized peers", () => {
    const input = [candidate("a", 90), candidate("b", 80)];
    expect(partitionDeprioritizedCandidates(input, { known: new Set(), skipped: new Set() })).toEqual(input);
  });

  it("places known peers after fresh candidates while preserving score order within tiers", () => {
    const input = [candidate("fresh", 70), candidate("known", 95), candidate("fresh2", 60)];
    const result = partitionDeprioritizedCandidates(input, {
      known: new Set(["known"]),
      skipped: new Set(),
    });
    expect(result.map((row) => row.userId)).toEqual(["fresh", "fresh2", "known"]);
  });

  it("places skipped peers last, after known peers", () => {
    const input = [
      candidate("fresh", 50),
      candidate("known", 90),
      candidate("skipped", 99),
      candidate("fresh2", 40),
    ];
    const result = partitionDeprioritizedCandidates(input, {
      known: new Set(["known"]),
      skipped: new Set(["skipped"]),
    });
    expect(result.map((row) => row.userId)).toEqual(["fresh", "fresh2", "known", "skipped"]);
  });

  it("treats skipped peers as lowest tier even when they are also known", () => {
    const input = [candidate("both", 80), candidate("fresh", 70)];
    const result = partitionDeprioritizedCandidates(input, {
      known: new Set(["both"]),
      skipped: new Set(["both"]),
    });
    expect(result.map((row) => row.userId)).toEqual(["fresh", "both"]);
  });

  it("does not change matchScore values when reordering", () => {
    const input = [candidate("known", 95), candidate("fresh", 70)];
    const result = partitionDeprioritizedCandidates(input, {
      known: new Set(["known"]),
      skipped: new Set(),
    });
    expect(result.find((row) => row.userId === "known")?.matchScore).toBe(95);
    expect(result.find((row) => row.userId === "fresh")?.matchScore).toBe(70);
  });
});

describe("rankCandidatesForPairing", () => {
  it("sorts by genuine score then deprioritizes known peers without lowering scores", () => {
    const input = [candidate("known", 95), candidate("fresh", 70), candidate("fresh2", 80)];
    const result = rankCandidatesForPairing(input, {
      known: new Set(["known"]),
      skipped: new Set(),
    });

    expect(result.map((row) => row.userId)).toEqual(["fresh2", "fresh", "known"]);
    expect(result.find((row) => row.userId === "known")?.matchScore).toBe(95);
  });
});
