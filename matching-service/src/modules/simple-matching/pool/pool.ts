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

  private async collectFromZset(
    requesterId: string,
    key: string,
    scanLimit: number,
    batchSize: number,
  ): Promise<MatchCandidate[]> {
    const redis = getRedis();
    const rows = await redis.zrevrange(key, 0, scanLimit - 1, "WITHSCORES");
    const candidates: MatchCandidate[] = [];
    for (let i = 0; i < rows.length; i += 2) {
      const userId = rows[i];
      const scoreRaw = rows[i + 1];
      if (!userId || !scoreRaw || userId === requesterId) continue;
      const state = await redis.get(redisKeys.userState(userId));
      if (state !== "searching") continue;
      candidates.push({ userId, score: Number(scoreRaw) });
      if (candidates.length >= batchSize) break;
    }
    return candidates;
  }

  private async mergePrimaryThenGlobal(
    requesterId: string,
    primaryRows: MatchCandidate[],
  ): Promise<MatchCandidate[]> {
    const redis = getRedis();
    const batchSize = MATCH_CONFIG.candidateBatchSize;
    const seen = new Set<string>();
    const out: MatchCandidate[] = [];

    const tryAdd = async (c: MatchCandidate): Promise<void> => {
      if (c.userId === requesterId || seen.has(c.userId)) return;
      const state = await redis.get(redisKeys.userState(c.userId));
      if (state !== "searching") return;
      seen.add(c.userId);
      out.push(c);
    };

    for (const c of primaryRows) {
      await tryAdd(c);
      if (out.length >= batchSize) return out;
    }

    const globalRows = await redis.zrevrange(
      redisKeys.poolGlobal(),
      0,
      MATCH_CONFIG.poolScanLimit - 1,
      "WITHSCORES",
    );
    for (let i = 0; i < globalRows.length && out.length < batchSize; i += 2) {
      const userId = globalRows[i];
      const scoreRaw = globalRows[i + 1];
      if (!userId || !scoreRaw) continue;
      await tryAdd({ userId, score: Number(scoreRaw) });
    }

    return out;
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
    const pending: Row[] = [];
    for (let i = 0; i < rows.length; i += 2) {
      const userId = rows[i];
      const scoreRaw = rows[i + 1];
      if (!userId || !scoreRaw || userId === requesterId) continue;
      pending.push({ userId, score: Number(scoreRaw), sortGroup: 1 });
    }

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

    const out: MatchCandidate[] = [];
    for (const p of pending) {
      if (out.length >= batchSize) break;
      const state = await redis.get(redisKeys.userState(p.userId));
      if (state !== "searching") continue;
      out.push({ userId: p.userId, score: p.score });
    }
    return out;
  }
}
