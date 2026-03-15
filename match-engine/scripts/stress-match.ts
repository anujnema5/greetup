import { connectRedis, disconnectRedis, getRedis } from "../src/redis/client";
import { redisKeys } from "../src/redis/keys";

type MatchResponse =
  | { ok: true; data: { status: "matched"; roomId: string; peerUserId: string } }
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
  usersMovedToInRoomThisRound: number;
  system: SystemMetrics;
};

const baseUrl = process.env.STRESS_BASE_URL ?? "http://127.0.0.1:8000";
const userCount = Number(process.env.STRESS_USERS ?? "30");
const rounds = Number(process.env.STRESS_ROUNDS ?? "3");
const groupSize = Number(process.env.STRESS_GROUP_SIZE ?? "3");
const newUsersMinPerRound = Number(process.env.STRESS_NEW_USERS_MIN ?? "2");
const newUsersMaxPerRound = Number(process.env.STRESS_NEW_USERS_MAX ?? "6");

const now = () => Date.now();

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
    gender: index % 2 === 0 ? "male" : "female",
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
      connectionTypes: [{ connectionType: { id: "friendship" } }],
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

const runFindMatch = async (userId: string, requestId: string): Promise<MatchResponse> => {
  try {
    const response = await fetch(`${baseUrl}/match/find`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, requestId }),
    });

    const data = (await response.json()) as MatchResponse;
    return data;
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
  const roomByUser = new Map<string, string>();
  const roomCollisions: string[] = [];

  for (const response of responses) {
    if (!response.ok) {
      failed += 1;
      continue;
    }

    if (response.data.status === "matched") {
      matchedThisRound += 1;
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
    usersMovedToInRoomThisRound,
    system,
  };
};

const main = async (): Promise<void> => {
  const users = makeUsers(userCount);
  let nextUserNumber = users.length;
  const everMatchedUsers = new Set<string>();
  console.log(
    `Stress config: baseUrl=${baseUrl} users=${userCount} rounds=${rounds} groupSize=${groupSize} newUsersPerRound=${newUsersMinPerRound}-${newUsersMaxPerRound}`,
  );

  await connectRedis();
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
      `[round ${summary.round}] users_in_system=${summary.totalUsersInSystem} eligible_at_start=${summary.eligibleUsersAtStart} requests_sent=${summary.requestsSent} skipped_in_room=${summary.skippedInRoomAtStart} skipped_locked=${summary.skippedLockedAtStart} skipped_other=${summary.skippedUnavailableAtStart} matched_this_round=${summary.matchedThisRound} no_match_eligible_end=${summary.unmatchedEligibleEndOfRound} response_searching=${summary.responseSearching} failed=${summary.failed} collisions=${summary.roomCollisions} moved_to_in_room=${summary.usersMovedToInRoomThisRound} ever_matched_users=${everMatchedUsers.size} never_matched_users=${neverMatchedUsers} elapsedMs=${summary.elapsedMs} in_room_now=${summary.system.usersInRoom} rooms_approx_now=${summary.system.roomsApprox} free_now=${summary.system.usersFree} searching_now=${summary.system.usersSearching} locked_now=${summary.system.usersLocked} available_now=${summary.system.availableToMatch} pool_now=${summary.system.poolSize} pair_locks_now=${summary.system.pairLocks} attempts_now=${summary.system.attemptKeys}`,
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
    },
  );

  console.log("Aggregate:", aggregate);
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
