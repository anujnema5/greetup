import { describe, expect, it } from "bun:test";

import { computeProfileSimilarityScore, type ProfileSimilaritySignals } from "./compute-profile-similarity";

const sig = (
  partial: Partial<ProfileSimilaritySignals> & Pick<ProfileSimilaritySignals, "interestIds">,
): ProfileSimilaritySignals => ({
  goalIds: [],
  professionId: null,
  ...partial,
});

describe("computeProfileSimilarityScore", () => {
  it("returns 0 when there is no shared interest", () => {
    const viewer = sig({ interestIds: ["a"], goalIds: ["g1"] });
    const peer = sig({ interestIds: ["b"], goalIds: ["g1"] });
    expect(computeProfileSimilarityScore(viewer, peer).matchScore).toBe(0);
  });

  it("gives identical scores for identical overlap signals", () => {
    const viewer = sig({
      interestIds: ["tech", "movies"],
      goalIds: ["friends", "network"],
      professionId: "eng",
    });
    const peerA = sig({
      interestIds: ["tech", "movies"],
      goalIds: ["friends", "network"],
      professionId: "eng",
    });
    const peerB = sig({
      interestIds: ["movies", "tech"],
      goalIds: ["network", "friends"],
      professionId: "eng",
    });

    const scoreA = computeProfileSimilarityScore(viewer, peerA).matchScore;
    const scoreB = computeProfileSimilarityScore(viewer, peerB).matchScore;
    expect(scoreA).toBe(scoreB);
    expect(scoreA).toBeGreaterThanOrEqual(85);
  });

  it("scores higher when profession and goals align, not only interests", () => {
    const viewer = sig({
      interestIds: ["tech", "movies"],
      goalIds: ["friends"],
      professionId: "eng",
    });
    const strong = sig({
      interestIds: ["tech", "movies"],
      goalIds: ["friends"],
      professionId: "eng",
    });
    const weak = sig({
      interestIds: ["tech", "movies"],
      goalIds: [],
      professionId: "teacher",
    });

    const strongScore = computeProfileSimilarityScore(viewer, strong).matchScore;
    const weakScore = computeProfileSimilarityScore(viewer, weak).matchScore;
    expect(strongScore).toBeGreaterThan(weakScore);
  });

  it("ranks fuller niche overlap above partial overlap", () => {
    const viewer = sig({
      interestIds: ["tech", "movies", "music"],
      goalIds: ["friends"],
      professionId: "eng",
    });
    const fullOverlap = sig({
      interestIds: ["tech", "movies", "music"],
      goalIds: ["friends"],
      professionId: "eng",
    });
    const partialOverlap = sig({
      interestIds: ["tech", "movies"],
      goalIds: ["friends"],
      professionId: "eng",
    });

    expect(
      computeProfileSimilarityScore(viewer, fullOverlap).matchScore,
    ).toBeGreaterThan(computeProfileSimilarityScore(viewer, partialOverlap).matchScore);
  });
});
