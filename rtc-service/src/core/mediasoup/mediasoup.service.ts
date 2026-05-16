import { createWorker } from "mediasoup";
import type { types as MediasoupTypes } from "mediasoup";
import { RTC_CONFIG } from "@/shared/constants";
import { logger } from "@/core/logging";

let worker: MediasoupTypes.Worker | null = null;

export async function initializeMediasoup(): Promise<void> {
  worker = await createWorker({
    logLevel: RTC_CONFIG.mediasoup.workerLogLevel,
    rtcMinPort: RTC_CONFIG.mediasoup.rtcMinPort,
    rtcMaxPort: RTC_CONFIG.mediasoup.rtcMaxPort,
  });

  worker.on("died", (error) => {
    logger.error("mediasoup Worker died", error);
    process.exit(1);
  });

  logger.info("mediasoup Worker created", {
    pid: worker.pid,
    rtcPorts: `${RTC_CONFIG.mediasoup.rtcMinPort}-${RTC_CONFIG.mediasoup.rtcMaxPort}`,
  });
}

export async function createRouter(): Promise<MediasoupTypes.Router> {
  if (!worker) throw new Error("mediasoup Worker not initialized");

  return worker.createRouter({
    mediaCodecs: RTC_CONFIG.mediasoup.mediaCodecs,
  });
}
