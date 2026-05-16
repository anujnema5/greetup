/**
 * Application configuration — single place for env vars (mirrors main `server` layout).
 */

const nodeEnv = process.env.NODE_ENV || 'development'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  env:      nodeEnv,
  logLevel: process.env.LOG_LEVEL,

  port: Number(process.env.PORT ?? 4000),

  anthropic: {
    apiKey:         required('ANTHROPIC_API_KEY'),
    scoringModel:   'claude-sonnet-4-6',
    feedbackModel:  'claude-sonnet-4-6',
  },

  db: {
    url: required('DATABASE_URL'),
  },

  redis: {
    host:     process.env.REDIS_HOST ?? 'localhost',
    port:     Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
  },

  voiceiq: {
    webhookSecret:      process.env.WEBHOOK_SECRET ?? 'change-me-in-production',
    windowSeconds:      30,
    scoringConcurrency: Number(process.env.SCORING_CONCURRENCY ?? 10),
    webhookConcurrency: Number(process.env.WEBHOOK_CONCURRENCY ?? 5),
  },
}

export default config
