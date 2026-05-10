import "@/shared/config/load-env";

const getNum = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  /** Stable per replica; client/gateway uses this to reach the node that holds the mediasoup Router. */
  rtcInstanceId: process.env.RTC_INSTANCE_ID ?? `rtc-${process.pid}`,
  nodeEnv: process.env.NODE_ENV ?? "development",
  host: process.env.RTC_HOST ?? "0.0.0.0",
  port: getNum(process.env.RTC_PORT, 5370),
  rtcMinPort: getNum(process.env.RTC_MIN_PORT, 40000),
  rtcMaxPort: getNum(process.env.RTC_MAX_PORT, 49999),
  webrtcListenIp: process.env.WEBRTC_LISTEN_IP ?? "0.0.0.0",
  webrtcAnnouncedIp: process.env.WEBRTC_ANNOUNCED_IP ?? "127.0.0.1",
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  redisPingTimeoutMs: getNum(process.env.REDIS_PING_TIMEOUT_MS, 800),
  internalApiKey: process.env.INTERNAL_API_KEY ?? "",
};
