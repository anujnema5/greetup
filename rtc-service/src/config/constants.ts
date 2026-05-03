/**
 * Shared runtime constants for rtc-service.
 *
 * - `RTC_CONFIG.mediasoup`: worker ports + router codecs (Opus / VP8 / H264).
 * - `RTC_CONFIG.webRtcTransport`: UDP/TCP listen addresses + bitrate caps for transports.
 */

import type { types as MediasoupTypes } from "mediasoup";
import { env } from "@/config/env";

export const APP_CONFIG = {
  serviceName: "rtc-service",
  host: env.host,
  port: env.port,
} as const;

export const RTC_CONFIG = {
  mediasoup: {
    workerLogLevel: "none" as MediasoupTypes.WorkerLogLevel,
    rtcMinPort: env.rtcMinPort,
    rtcMaxPort: env.rtcMaxPort,
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
        // DTX: less bandwidth when quiet; FEC: helps lossy Wi‑Fi without extra RTX.
        parameters: {
          minptime: 10,
          useinbandfec: 1,
          usedtx: 1,
        },
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: { "x-google-start-bitrate": 1000 },
      },
      {
        kind: "video",
        mimeType: "video/H264",
        clockRate: 90000,
        parameters: {
          "packetization-mode": 1,
          "profile-level-id": "4d0032",
          "level-asymmetry-allowed": 1,
        },
      },
    ] as unknown as MediasoupTypes.RtpCodecCapability[],
  },
  webRtcTransport: {
    listenInfos: [
      { protocol: "udp" as const, ip: env.webrtcListenIp, announcedAddress: env.webrtcAnnouncedIp },
      { protocol: "tcp" as const, ip: env.webrtcListenIp, announcedAddress: env.webrtcAnnouncedIp },
    ] as MediasoupTypes.TransportListenInfo[],
    // Room for simulcast + screen share; consumers still drop to lower layers on bad links.
    maxIncomingBitrate: 3_000_000,
    initialAvailableOutgoingBitrate: 2_500_000,
  },
} as const;
