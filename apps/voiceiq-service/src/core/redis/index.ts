/**
 * Shared Redis client for direct key access (BullMQ uses separate connections).
 */

import Redis from 'ioredis'
import config from '@/shared/config/config.ts'

export { VOICEIQ_KEYS } from './keys.ts'

export const redis = new Redis({
  host:     config.redis.host,
  port:     config.redis.port,
  password: config.redis.password,
})
