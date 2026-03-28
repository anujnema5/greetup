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
};
