export const redisScripts = {
  lockPair: `
    local userLockA = KEYS[1]
    local userLockB = KEYS[2]
    local pairLockKey = KEYS[3]
    local userStateA = KEYS[4]
    local userStateB = KEYS[5]

    local attemptId = ARGV[1]
    local lockTtlMs = tonumber(ARGV[2])
    local requiredState = ARGV[3]
    local targetState = ARGV[4]

    if redis.call("EXISTS", pairLockKey) == 1 then
      return 0
    end

    if redis.call("EXISTS", userLockA) == 1 or redis.call("EXISTS", userLockB) == 1 then
      return 0
    end

    local stateA = redis.call("GET", userStateA)
    local stateB = redis.call("GET", userStateB)
    if stateA ~= requiredState or stateB ~= requiredState then
      return 0
    end

    local lockAResult = redis.call("SET", userLockA, attemptId, "PX", lockTtlMs, "NX")
    if not lockAResult then
      return 0
    end

    local lockBResult = redis.call("SET", userLockB, attemptId, "PX", lockTtlMs, "NX")
    if not lockBResult then
      redis.call("DEL", userLockA)
      return 0
    end

    local pairResult = redis.call("SET", pairLockKey, attemptId, "PX", lockTtlMs, "NX")
    if not pairResult then
      redis.call("DEL", userLockA)
      redis.call("DEL", userLockB)
      return 0
    end

    redis.call("SET", userStateA, targetState)
    redis.call("SET", userStateB, targetState)
    return 1
  `,

  /** Sets this side's connect flag; returns 2 if this caller should create the room, 1 if peer is, 0 if still waiting */
  recordProposalConnect: `
    local pendingKey = KEYS[1]
    local finalizeKey = KEYS[2]
    local field = ARGV[1]
    local finalizeTtl = tonumber(ARGV[2])

    redis.call("HSET", pendingKey, field, "1")
    local c1 = redis.call("HGET", pendingKey, "connectLow")
    local c2 = redis.call("HGET", pendingKey, "connectHigh")
    if c1 == "1" and c2 == "1" then
      local ok = redis.call("SET", finalizeKey, "1", "NX", "EX", finalizeTtl)
      if ok then
        return 2
      end
      return 1
    end
    return 0
  `,
};
