import { connectRedis, disconnectRedis, getRedis } from "../src/core/redis/client";
import { redisKeys } from "../src/core/redis/keys";

type MatchResponse =
  | { ok: true; data: { status: "matched"; roomId: string; peerUserId: string; matchScore: number } }
  | { ok: true; data: { status: "searching"; retryAfterMs: number } }
  | { ok: true; data: { status: "no_match"; reason: string } }
  | { ok: false; error: string };

type StressState = "free" | "searching" | "locked" | "in_room" | "unknown";

type SystemMetrics = {
  usersTotal: number;
  usersFree: number;
  usersSearching: number;
  usersLocked: number;
  usersInRoom: number;
  usersUnknown: number;
  roomsApprox: number;
  availableToMatch: number;
  poolSize: number;
  pairLocks: number;
  attemptKeys: number;
};

type RoundSummary = {
  round: number;
  elapsedMs: number;
  totalUsersInSystem: number;
  eligibleUsersAtStart: number;
  requestsSent: number;
  skippedInRoomAtStart: number;
  skippedLockedAtStart: number;
  skippedUnavailableAtStart: number;
  matchedThisRound: number;
  unmatchedEligibleEndOfRound: number;
  responseSearching: number;
  failed: number;
  roomCollisions: number;
  topFailureReason: string | null;
  avgMatchScore: number | null;
  minMatchScore: number | null;
  maxMatchScore: number | null;
  usersMovedToInRoomThisRound: number;
  system: SystemMetrics;
};

const baseUrl = process.env.STRESS_BASE_URL ?? "http://localhost:8000";
const userCount = Number(process.env.STRESS_USERS ?? "30");
const rounds = Number(process.env.STRESS_ROUNDS ?? "3");
const groupSize = Number(process.env.STRESS_GROUP_SIZE ?? "3");
const newUsersMinPerRound = Number(process.env.STRESS_NEW_USERS_MIN ?? "2");
const newUsersMaxPerRound = Number(process.env.STRESS_NEW_USERS_MAX ?? "6");

const now = () => Date.now();
const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const makeUsers = (count: number): string[] => {
  return Array.from({ length: count }, (_, index) => `stress-user-${index + 1}`);
};

const randomInt = (min: number, max: number): number => {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
};

const groupIdFor = (index: number): string => `g-${Math.floor(index / groupSize)}`;

const snapshotFor = (userId: string, index: number): Record<string, unknown> => {
  const groupId = groupIdFor(index);
  return {
    userId,
    version: 1,
    updatedAt: now(),
    age: 20 + (index % 10),
    gender: Math.random() < 0.5 ? "male" : "female",
    location: {
      countryCode: "IN",
      region: "MH",
      city: index % 2 === 0 ? "Pune" : "Mumbai",
    },
    preferences: {
      preferredGender: "any",
      minAge: 18,
      maxAge: 99,
      distancePreference: "same_country",
    },
    interests: [{ interest: { id: groupId } }],
    goals: [{ goal: { id: "chill" } }],
    professions: [{ profession: { id: "eng" } }],
    behavior: {
      trustScore: 100,
    },
  };
};

const cleanupKeys = async (userIds: string[]): Promise<void> => {
  const redis = getRedis();
  const keysToDelete = [redisKeys.poolGlobal()];
  for (const userId of userIds) {
    keysToDelete.push(
      redisKeys.snapshot(userId),
      redisKeys.userState(userId),
      redisKeys.userLock(userId),
      redisKeys.userLastAttempt(userId),
    );
  }

  const pairKeys = await redis.keys("mm:pair:lock:*");
  const attemptKeys = await redis.keys("mm:attempt:*");
  const stressSnapshotKeys = await redis.keys("user:profile:snapshot:stress-user-*");
  const stressStateKeys = await redis.keys("mm:state:stress-user-*");
  const stressUserLockKeys = await redis.keys("mm:lock:user:stress-user-*");
  const stressLastAttemptKeys = await redis.keys("mm:user:last-attempt:stress-user-*");
  await redis.del(
    ...keysToDelete,
    ...pairKeys,
    ...attemptKeys,
    ...stressSnapshotKeys,
    ...stressStateKeys,
    ...stressUserLockKeys,
    ...stressLastAttemptKeys,
  );
};

const seedSnapshots = async (userIds: string[], startIndex = 0): Promise<void> => {
  const redis = getRedis();
  const pipeline = redis.pipeline();

  for (let index = startIndex; index < userIds.length; index += 1) {
    const userId = userIds[index];
    if (!userId) continue;
    pipeline.set(redisKeys.snapshot(userId), JSON.stringify(snapshotFor(userId, index)));
    pipeline.set(redisKeys.userState(userId), "free");
  }

  await pipeline.exec();
};

const generateNewUsers = (startIndex: number, count: number): string[] => {
  return Array.from({ length: count }, (_, index) => `stress-user-${startIndex + index + 1}`);
};

const waitForFinalResult = async (
  requestId: string,
  initialRetryAfterMs: number,
): Promise<MatchResponse> => {
  const deadline = Date.now() + 35_000;
  let waitMs = Math.max(200, initialRetryAfterMs);

  while (Date.now() < deadline) {
    await sleep(waitMs);

    try {
      const response = await fetch(`${baseUrl}/match/result/${encodeURIComponent(requestId)}`);
      const text = await response.text();
      if (!text.trim()) {
        waitMs = Math.min(waitMs + 300, 2_000);
        continue;
      }

      const payload = JSON.parse(text) as MatchResponse;
      if (!payload.ok) {
        return payload;
      }

      if (payload.data.status === "searching") {
        waitMs = Math.min(payload.data.retryAfterMs, 2_000);
        continue;
      }

      return payload;
    } catch {
      waitMs = Math.min(waitMs + 300, 2_000);
    }
  }

  return {
    ok: false,
    error: "result_poll_timeout",
  };
};

const runFindMatch = async (userId: string, requestId: string): Promise<MatchResponse> => {
  try {
    const response = await fetch(`${baseUrl}/match/find`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, requestId }),
    });

    const text = await response.text();
    if (!text.trim()) {
      return {
        ok: false,
        error: `empty_response_http_${response.status}`,
      };
    }

    try {
      const data = JSON.parse(text) as MatchResponse;
      if (!data.ok || data.data.status !== "searching") {
        return data;
      }
      return waitForFinalResult(requestId, data.data.retryAfterMs);
    } catch {
      return {
        ok: false,
        error: `invalid_json_http_${response.status}`,
      };
    }
  } catch (error) {
    return {
      ok: false,
      error: String(error),
    };
  }
};

const collectSystemMetrics = async (userIds: string[]): Promise<SystemMetrics> => {
  const redis = getRedis();
  const stateKeys = userIds.map((userId) => redisKeys.userState(userId));
  const states = stateKeys.length > 0 ? await redis.mget(...stateKeys) : [];

  let usersFree = 0;
  let usersSearching = 0;
  let usersLocked = 0;
  let usersInRoom = 0;
  let usersUnknown = 0;

  for (const state of states) {
    const normalized = (state ?? "unknown") as StressState;
    if (normalized === "free") usersFree += 1;
    else if (normalized === "searching") usersSearching += 1;
    else if (normalized === "locked") usersLocked += 1;
    else if (normalized === "in_room") usersInRoom += 1;
    else usersUnknown += 1;
  }

  const [poolSize, pairLockKeys, attemptKeys] = await Promise.all([
    redis.zcard(redisKeys.poolGlobal()),
    redis.keys("mm:pair:lock:*"),
    redis.keys("mm:attempt:*"),
  ]);

  return {
    usersTotal: userIds.length,
    usersFree,
    usersSearching,
    usersLocked,
    usersInRoom,
    usersUnknown,
    roomsApprox: Math.floor(usersInRoom / 2),
    availableToMatch: usersFree + usersSearching,
    poolSize,
    pairLocks: pairLockKeys.length,
    attemptKeys: attemptKeys.length,
  };
};

const fetchStatesForUsers = async (userIds: string[]): Promise<Map<string, StressState>> => {
  const redis = getRedis();
  const stateKeys = userIds.map((userId) => redisKeys.userState(userId));
  const states = stateKeys.length > 0 ? await redis.mget(...stateKeys) : [];
  const map = new Map<string, StressState>();

  for (let index = 0; index < userIds.length; index += 1) {
    const userId = userIds[index];
    if (!userId) continue;
    const state = (states[index] ?? "unknown") as StressState;
    map.set(userId, state);
  }

  return map;
};

const runRound = async (round: number, userIds: string[]) => {
  const preStates = await fetchStatesForUsers(userIds);
  const eligibleUsers: string[] = [];
  let skippedInRoomAtStart = 0;
  let skippedLockedAtStart = 0;
  let skippedUnavailableAtStart = 0;

  for (const userId of userIds) {
    const state = preStates.get(userId) ?? "unknown";
    if (state === "free" || state === "searching" || state === "unknown") {
      eligibleUsers.push(userId);
      continue;
    }
    if (state === "in_room") {
      skippedInRoomAtStart += 1;
      continue;
    }
    if (state === "locked") {
      skippedLockedAtStart += 1;
      continue;
    }
    skippedUnavailableAtStart += 1;
  }

  const requests = eligibleUsers.map((userId, index) => {
    const requestId = `stress-${round}-${index + 1}`;
    return runFindMatch(userId, requestId);
  });

  const start = now();
  const responses = await Promise.all(requests);
  const elapsedMs = now() - start;

  let matchedThisRound = 0;
  let responseSearching = 0;
  let failed = 0;
  const matchedScores: number[] = [];
  const failureReasons = new Map<string, number>();
  const roomByUser = new Map<string, string>();
  const roomCollisions: string[] = [];

  for (const response of responses) {
    if (!response.ok) {
      failed += 1;
      const current = failureReasons.get(response.error) ?? 0;
      failureReasons.set(response.error, current + 1);
      continue;
    }

    if (response.data.status === "matched") {
      matchedThisRound += 1;
      matchedScores.push(response.data.matchScore);
      const existing = roomByUser.get(response.data.peerUserId);
      if (existing && existing !== response.data.roomId) {
        roomCollisions.push(response.data.peerUserId);
      } else {
        roomByUser.set(response.data.peerUserId, response.data.roomId);
      }
      continue;
    }

    if (response.data.status === "searching") {
      responseSearching += 1;
      continue;
    }
  }

  const postStates = await fetchStatesForUsers(userIds);
  let unmatchedEligibleEndOfRound = 0;
  let usersMovedToInRoomThisRound = 0;

  for (const userId of eligibleUsers) {
    const postState = postStates.get(userId) ?? "unknown";
    if (postState !== "in_room") {
      unmatchedEligibleEndOfRound += 1;
    }
  }

  for (const userId of userIds) {
    const preState = preStates.get(userId) ?? "unknown";
    const postState = postStates.get(userId) ?? "unknown";
    if (preState !== "in_room" && postState === "in_room") {
      usersMovedToInRoomThisRound += 1;
    }
  }

  const system = await collectSystemMetrics(userIds);
  const topFailureReason =
    failureReasons.size > 0
      ? [...failureReasons.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      : null;
  const avgMatchScore =
    matchedScores.length > 0
      ? Math.round(matchedScores.reduce((sum, score) => sum + score, 0) / matchedScores.length)
      : null;
  const minMatchScore = matchedScores.length > 0 ? Math.min(...matchedScores) : null;
  const maxMatchScore = matchedScores.length > 0 ? Math.max(...matchedScores) : null;

  return {
    round,
    elapsedMs,
    totalUsersInSystem: userIds.length,
    eligibleUsersAtStart: eligibleUsers.length,
    requestsSent: responses.length,
    skippedInRoomAtStart,
    skippedLockedAtStart,
    skippedUnavailableAtStart,
    matchedThisRound,
    unmatchedEligibleEndOfRound,
    responseSearching,
    failed,
    roomCollisions: roomCollisions.length,
    topFailureReason,
    avgMatchScore,
    minMatchScore,
    maxMatchScore,
    usersMovedToInRoomThisRound,
    system,
  };
};

const assertServiceReachable = async (): Promise<void> => {
  const healthUrl = `${baseUrl}/health`;
  let response: Response;
  try {
    response = await fetch(healthUrl);
  } catch (error) {
    throw new Error(
      `Matching service unreachable at ${healthUrl}. Start it first with 'bun run dev'. Cause: ${String(error)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Matching service health check failed at ${healthUrl} with HTTP ${response.status}.`,
    );
  }
};

const main = async (): Promise<void> => {
  const users = makeUsers(userCount);
  let nextUserNumber = users.length;
  const everMatchedUsers = new Set<string>();
  console.log(
    `Stress config: baseUrl=${baseUrl} users=${userCount} rounds=${rounds} groupSize=${groupSize} newUsersPerRound=${newUsersMinPerRound}-${newUsersMaxPerRound}`,
  );

  await connectRedis();
  await assertServiceReachable();
  await cleanupKeys(users);
  await seedSnapshots(users);

  const summaries: RoundSummary[] = [];
  for (let round = 1; round <= rounds; round += 1) {
    if (round > 1) {
      const incomingCount = randomInt(newUsersMinPerRound, newUsersMaxPerRound);
      const newUsers = generateNewUsers(nextUserNumber, incomingCount);
      nextUserNumber += incomingCount;
      users.push(...newUsers);
      await seedSnapshots(users, users.length - newUsers.length);
      console.log(`[round ${round}] addedNewUsers=${incomingCount} totalUsersNow=${users.length}`);
    }

    const summary = await runRound(round, users);
    summaries.push(summary);
    const statesAfterRound = await fetchStatesForUsers(users);
    for (const [userId, state] of statesAfterRound.entries()) {
      if (state === "in_room") {
        everMatchedUsers.add(userId);
      }
    }
    const neverMatchedUsers = users.length - everMatchedUsers.size;
    console.log(
      `[round ${summary.round}] users_in_system=${summary.totalUsersInSystem} eligible_at_start=${summary.eligibleUsersAtStart} requests_sent=${summary.requestsSent} skipped_in_room=${summary.skippedInRoomAtStart} skipped_locked=${summary.skippedLockedAtStart} skipped_other=${summary.skippedUnavailableAtStart} matched_this_round=${summary.matchedThisRound} match_score_avg=${summary.avgMatchScore ?? "na"} match_score_min=${summary.minMatchScore ?? "na"} match_score_max=${summary.maxMatchScore ?? "na"} no_match_eligible_end=${summary.unmatchedEligibleEndOfRound} response_searching=${summary.responseSearching} failed=${summary.failed} top_failure=${summary.topFailureReason ?? "none"} collisions=${summary.roomCollisions} moved_to_in_room=${summary.usersMovedToInRoomThisRound} ever_matched_users=${everMatchedUsers.size} never_matched_users=${neverMatchedUsers} elapsedMs=${summary.elapsedMs} in_room_now=${summary.system.usersInRoom} rooms_approx_now=${summary.system.roomsApprox} free_now=${summary.system.usersFree} searching_now=${summary.system.usersSearching} locked_now=${summary.system.usersLocked} available_now=${summary.system.availableToMatch} pool_now=${summary.system.poolSize} pair_locks_now=${summary.system.pairLocks} attempts_now=${summary.system.attemptKeys}`,
    );
  }

  const aggregate = summaries.reduce(
    (acc, item) => {
      acc.totalUsersInSystem += item.totalUsersInSystem;
      acc.eligibleUsersAtStart += item.eligibleUsersAtStart;
      acc.requestsSent += item.requestsSent;
      acc.skippedInRoomAtStart += item.skippedInRoomAtStart;
      acc.skippedLockedAtStart += item.skippedLockedAtStart;
      acc.skippedUnavailableAtStart += item.skippedUnavailableAtStart;
      acc.matchedThisRound += item.matchedThisRound;
      acc.unmatchedEligibleEndOfRound += item.unmatchedEligibleEndOfRound;
      acc.responseSearching += item.responseSearching;
      acc.failed += item.failed;
      acc.roomCollisions += item.roomCollisions;
      acc.usersMovedToInRoomThisRound += item.usersMovedToInRoomThisRound;
      acc.elapsedMs += item.elapsedMs;
      if (item.avgMatchScore !== null && item.matchedThisRound > 0) {
        acc.weightedScoreSum += item.avgMatchScore * item.matchedThisRound;
        acc.totalMatchedWithScore += item.matchedThisRound;
      }
      if (item.minMatchScore !== null) {
        acc.minMatchScoreOverall =
          acc.minMatchScoreOverall === null
            ? item.minMatchScore
            : Math.min(acc.minMatchScoreOverall, item.minMatchScore);
      }
      if (item.maxMatchScore !== null) {
        acc.maxMatchScoreOverall =
          acc.maxMatchScoreOverall === null
            ? item.maxMatchScore
            : Math.max(acc.maxMatchScoreOverall, item.maxMatchScore);
      }
      return acc;
    },
    {
      totalUsersInSystem: 0,
      eligibleUsersAtStart: 0,
      requestsSent: 0,
      skippedInRoomAtStart: 0,
      skippedLockedAtStart: 0,
      skippedUnavailableAtStart: 0,
      matchedThisRound: 0,
      unmatchedEligibleEndOfRound: 0,
      responseSearching: 0,
      failed: 0,
      roomCollisions: 0,
      usersMovedToInRoomThisRound: 0,
      elapsedMs: 0,
      weightedScoreSum: 0,
      totalMatchedWithScore: 0,
      minMatchScoreOverall: null as number | null,
      maxMatchScoreOverall: null as number | null,
    },
  );

  const aggregateWithScore = {
    ...aggregate,
    avgMatchScoreOverall:
      aggregate.totalMatchedWithScore > 0
        ? Math.round(aggregate.weightedScoreSum / aggregate.totalMatchedWithScore)
        : null,
  };

  console.log("Aggregate:", aggregateWithScore);
  console.log("LifetimeMatchStats:", {
    usersInSystemNow: users.length,
    everMatchedUsers: everMatchedUsers.size,
    neverMatchedUsers: users.length - everMatchedUsers.size,
  });
  const finalSystem = summaries[summaries.length - 1]?.system;
  if (finalSystem) {
    console.log("FinalSystemState:", finalSystem);
  }
  await disconnectRedis();
};

main().catch(async (error) => {
  console.error("Stress run failed", error);
  try {
    await disconnectRedis();
  } catch {
    // ignore disconnect error during failure cleanup
  }
  process.exit(1);
});
