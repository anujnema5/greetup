import { MATCH_CONFIG } from "@/shared/config/constants";
import type { SnapshotUserProfile } from "@/modules/simple-matching/types";
import {
  canonicalDistancePreference,
  normalizeCountryCode,
  slugLocationPart,
} from "@/modules/simple-matching/scoring/location";
import type { MatchCandidate } from "@/modules/simple-matching/types";
import { buildLocationPoolIndexMeta } from "@/modules/simple-matching/pool/location-index";
import {
  peekCountryCodesByUserIds,
  snapshotRepository,
} from "@/modules/simple-matching/repositories/snapshot";
import { getRedis } from "@/core/redis/client";
import { redisKeys } from "@/core/redis/keys";
import { filterBlockedPeers } from "@/modules/simple-matching/blocks/blocked-peers";

type LocationPoolIndexMeta = {
  countryCode?: string;
  citySlug?: string;
  regionSlug?: string;
};

export class MatchPoolService {
  /** Removes user from all pool zsets + meta. Does not touch `mm:state`. */
  async stripFromPool(userId: string): Promise<void> {
    const redis = getRedis();
    const raw = await redis.get(redisKeys.poolUserLocationMeta(userId));
    const pipeline = redis.pipeline();
    pipeline.zrem(redisKeys.poolGlobal(), userId);
    if (raw) {
      try {
        const idx = JSON.parse(raw) as LocationPoolIndexMeta;
        if (idx.countryCode) {
          pipeline.zrem(redisKeys.poolByCountry(idx.countryCode), userId);
          if (idx.citySlug) {
            pipeline.zrem(redisKeys.poolByCity(idx.countryCode, idx.citySlug), userId);
          }
          if (idx.regionSlug) {
            pipeline.zrem(redisKeys.poolByRegion(idx.countryCode, idx.regionSlug), userId);
          }
        }
      } catch {
        /* ignore corrupt meta */
      }
    }
    pipeline.del(redisKeys.poolUserLocationMeta(userId));
    await pipeline.exec();
  }

  async enqueue(userId: string): Promise<void> {
    const redis = getRedis();
    const now = Date.now();
    const snap = await snapshotRepository.getByUserId(userId);
    const idx = buildLocationPoolIndexMeta(snap);

    const pipeline = redis.pipeline();
    pipeline.zadd(redisKeys.poolGlobal(), now, userId);
    if (idx.countryCode) {
      pipeline.zadd(redisKeys.poolByCountry(idx.countryCode), now, userId);
      if (idx.citySlug) {
        pipeline.zadd(redisKeys.poolByCity(idx.countryCode, idx.citySlug), now, userId);
      }
      if (idx.regionSlug) {
        pipeline.zadd(redisKeys.poolByRegion(idx.countryCode, idx.regionSlug), now, userId);
      }
    }
    pipeline.set(redisKeys.poolUserLocationMeta(userId), JSON.stringify(idx));
    pipeline.set(redisKeys.userState(userId), "searching");
    await pipeline.exec();
  }

  async remove(userId: string): Promise<void> {
    const redis = getRedis();
    await this.stripFromPool(userId);
    await redis.del(redisKeys.userState(userId));
  }

  async getCandidates(requesterId: string, requesterSnapshot: SnapshotUserProfile): Promise<MatchCandidate[]> {
    /** Location buckets + distancePreference apply only when explicitly enabled on the snapshot. */
    const locEnabled = requesterSnapshot.filters.locationPreferenceEnabled === true;
    const prefRaw = requesterSnapshot.filters.distancePreference;
    const pref = typeof prefRaw === "string" ? prefRaw : null;
    const canonical = canonicalDistancePreference(pref);

    if (!locEnabled || !canonical || canonical === "random") {
      return this.collectFromZset(
        requesterId,
        redisKeys.poolGlobal(),
        MATCH_CONFIG.poolScanLimit,
        MATCH_CONFIG.candidateBatchSize,
      );
    }

    if (canonical === "global") {
      return this.collectGlobalForeignFirst(requesterId, requesterSnapshot);
    }

    if (canonical === "same_city") {
      const cc = normalizeCountryCode(
        typeof requesterSnapshot.filters.countryCode === "string"
          ? requesterSnapshot.filters.countryCode
          : "",
      );
      const city = slugLocationPart(
        typeof requesterSnapshot.filters.city === "string" ? requesterSnapshot.filters.city : null,
      );
      if (cc && city) {
        const primary = await this.zrevrangeWithScores(
          redisKeys.poolByCity(cc, city),
          MATCH_CONFIG.poolScanLimit,
        );
        return this.mergePrimaryThenGlobal(requesterId, primary);
      }
      return this.collectFromZset(
        requesterId,
        redisKeys.poolGlobal(),
        MATCH_CONFIG.poolScanLimit,
        MATCH_CONFIG.candidateBatchSize,
      );
    }

    if (canonical === "same_country") {
      const cc = normalizeCountryCode(
        typeof requesterSnapshot.filters.countryCode === "string"
          ? requesterSnapshot.filters.countryCode
          : "",
      );
      if (cc) {
        const primary = await this.zrevrangeWithScores(redisKeys.poolByCountry(cc), MATCH_CONFIG.poolScanLimit);
        return this.mergePrimaryThenGlobal(requesterId, primary);
      }
      return this.collectFromZset(
        requesterId,
        redisKeys.poolGlobal(),
        MATCH_CONFIG.poolScanLimit,
        MATCH_CONFIG.candidateBatchSize,
      );
    }

    if (canonical === "same_region") {
      const cc = normalizeCountryCode(
        typeof requesterSnapshot.filters.countryCode === "string"
          ? requesterSnapshot.filters.countryCode
          : "",
      );
      const reg = slugLocationPart(
        typeof requesterSnapshot.filters.region === "string" ? requesterSnapshot.filters.region : null,
      );
      if (cc && reg) {
        const primary = await this.zrevrangeWithScores(
          redisKeys.poolByRegion(cc, reg),
          MATCH_CONFIG.poolScanLimit,
        );
        return this.mergePrimaryThenGlobal(requesterId, primary);
      }
      return this.collectFromZset(
        requesterId,
        redisKeys.poolGlobal(),
        MATCH_CONFIG.poolScanLimit,
        MATCH_CONFIG.candidateBatchSize,
      );
    }

    return this.collectFromZset(
      requesterId,
      redisKeys.poolGlobal(),
      MATCH_CONFIG.poolScanLimit,
      MATCH_CONFIG.candidateBatchSize,
    );
  }

  private async zrevrangeWithScores(key: string, limit: number): Promise<MatchCandidate[]> {
    const redis = getRedis();
    const rows = await redis.zrevrange(key, 0, limit - 1, "WITHSCORES");
    const out: MatchCandidate[] = [];
    for (let i = 0; i < rows.length; i += 2) {
      const userId = rows[i];
      const scoreRaw = rows[i + 1];
      if (userId && scoreRaw) {
        out.push({ userId, score: Number(scoreRaw) });
      }
    }
    return out;
  }

  /**
   * Batched "which of these users are still searching" via a single MGET.
   * Replaces per-candidate `GET mm:state` round-trips that head-of-line block
   * the shared request-path Redis connection.
   */
  private async fetchSearchingStates(userIds: string[]): Promise<Set<string>> {
    const searching = new Set<string>();
    if (userIds.length === 0) return searching;
    const redis = getRedis();
    const states = await redis.mget(...userIds.map((id) => redisKeys.userState(id)));
    for (let i = 0; i < userIds.length; i += 1) {
      const uid = userIds[i];
      if (uid !== undefined && states[i] === "searching") searching.add(uid);
    }
    return searching;
  }

  /**
   * Filters an ordered candidate list down to unblocked, still-searching peers,
   * preserving input order and stopping at `batchSize`. Uses two batched Redis
   * round-trips (block sets + state MGET) instead of two per candidate.
   */
  private async filterCandidates(
    requesterId: string,
    ordered: MatchCandidate[],
    batchSize: number,
  ): Promise<MatchCandidate[]> {
    if (ordered.length === 0) return [];
    const ids = ordered.map((c) => c.userId);
    const [blocked, searching] = await Promise.all([
      filterBlockedPeers(requesterId, ids),
      this.fetchSearchingStates(ids),
    ]);
    const out: MatchCandidate[] = [];
    for (const c of ordered) {
      if (blocked.has(c.userId) || !searching.has(c.userId)) continue;
      out.push(c);
      if (out.length >= batchSize) break;
    }
    return out;
  }

  private async collectFromZset(
    requesterId: string,
    key: string,
    scanLimit: number,
    batchSize: number,
  ): Promise<MatchCandidate[]> {
    const redis = getRedis();
    const rows = await redis.zrevrange(key, 0, scanLimit - 1, "WITHSCORES");
    const ordered: MatchCandidate[] = [];
    for (let i = 0; i < rows.length; i += 2) {
      const userId = rows[i];
      const scoreRaw = rows[i + 1];
      if (!userId || !scoreRaw || userId === requesterId) continue;
      ordered.push({ userId, score: Number(scoreRaw) });
    }
    return this.filterCandidates(requesterId, ordered, batchSize);
  }

  private async mergePrimaryThenGlobal(
    requesterId: string,
    primaryRows: MatchCandidate[],
  ): Promise<MatchCandidate[]> {
    const redis = getRedis();
    const batchSize = MATCH_CONFIG.candidateBatchSize;
    const seen = new Set<string>();

    // Ordered primary-then-global candidate list, deduped, requester excluded.
    const ordered: MatchCandidate[] = [];
    const pushUnique = (c: MatchCandidate): void => {
      if (c.userId === requesterId || seen.has(c.userId)) return;
      seen.add(c.userId);
      ordered.push(c);
    };

    for (const c of primaryRows) pushUnique(c);

    const globalRows = await redis.zrevrange(
      redisKeys.poolGlobal(),
      0,
      MATCH_CONFIG.poolScanLimit - 1,
      "WITHSCORES",
    );
    for (let i = 0; i < globalRows.length; i += 2) {
      const userId = globalRows[i];
      const scoreRaw = globalRows[i + 1];
      if (!userId || !scoreRaw) continue;
      pushUnique({ userId, score: Number(scoreRaw) });
    }

    return this.filterCandidates(requesterId, ordered, batchSize);
  }

  private async collectGlobalForeignFirst(
    requesterId: string,
    requesterSnapshot: SnapshotUserProfile,
  ): Promise<MatchCandidate[]> {
    const redis = getRedis();
    const fetchCap = MATCH_CONFIG.poolGlobalSortFetch;
    const batchSize = MATCH_CONFIG.candidateBatchSize;
    const rows = await redis.zrevrange(redisKeys.poolGlobal(), 0, fetchCap - 1, "WITHSCORES");

    type Row = MatchCandidate & { sortGroup: number };
    const parsed: Row[] = [];
    for (let i = 0; i < rows.length; i += 2) {
      const userId = rows[i];
      const scoreRaw = rows[i + 1];
      if (!userId || !scoreRaw || userId === requesterId) continue;
      parsed.push({ userId, score: Number(scoreRaw), sortGroup: 1 });
    }

    // Single batched block-set check instead of one round-trip per candidate.
    const blocked = await filterBlockedPeers(
      requesterId,
      parsed.map((p) => p.userId),
    );
    const pending = parsed.filter((p) => !blocked.has(p.userId));

    const ids = pending.map((p) => p.userId);
    const ccMap = await peekCountryCodesByUserIds(ids);
    const home =
      normalizeCountryCode(
        typeof requesterSnapshot.filters.countryCode === "string"
          ? requesterSnapshot.filters.countryCode
          : "",
      ) ??
      normalizeCountryCode(
        typeof requesterSnapshot.attributes.countryCode === "string"
          ? requesterSnapshot.attributes.countryCode
          : "",
      );

    for (const p of pending) {
      const peerCc = ccMap.get(p.userId) ?? null;
      if (!home || !peerCc) {
        p.sortGroup = 1;
      } else if (peerCc === home) {
        p.sortGroup = 1;
      } else {
        p.sortGroup = 0;
      }
    }

    pending.sort((a, b) => {
      if (a.sortGroup !== b.sortGroup) return a.sortGroup - b.sortGroup;
      return b.score - a.score;
    });

    // Single batched state MGET instead of one GET per candidate.
    const searching = await this.fetchSearchingStates(pending.map((p) => p.userId));
    const out: MatchCandidate[] = [];
    for (const p of pending) {
      if (out.length >= batchSize) break;
      if (!searching.has(p.userId)) continue;
      out.push({ userId: p.userId, score: p.score });
    }
    return out;
  }
}
