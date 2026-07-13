/**
 * Outbound video settings for mediasoup `sendTransport.produce`.
 *
 * - Camera: simulcast (multiple spatial layers) so the SFU can serve small tiles vs main stage.
 * - Screen: single encoding to avoid encoding the same capture three times (CPU).
 * - Mobile vs desktop profiles live here; capture resolution is in `use-mediasoup-local-media`.
 */

import type { Producer, RtpEncodingParameters, Transport } from "mediasoup-client/types";
import { isMobileRtcCaptureProfile } from "@/features/rtc/lib/rtc-mobile-profile";

// ─── Camera (simulcast) ──────────────────────────────────────────────────────

/** Desktop: three layers — small / medium / full for adaptive routing. */
export const CAMERA_VIDEO_SIMULCAST_ENCODINGS: RtpEncodingParameters[] = [
  { rid: "r0", scaleResolutionDownBy: 4, maxBitrate: 90_000 },
  { rid: "r1", scaleResolutionDownBy: 2, maxBitrate: 400_000 },
  { rid: "r2", scaleResolutionDownBy: 1, maxBitrate: 1_400_000 },
];

/** Mobile: two layers only — less encoder load, still enough for gallery + main. */
export const CAMERA_VIDEO_SIMULCAST_ENCODINGS_MOBILE: RtpEncodingParameters[] = [
  { rid: "m0", scaleResolutionDownBy: 4, maxBitrate: 55_000 },
  { rid: "m1", scaleResolutionDownBy: 1, maxBitrate: 750_000 },
];

export function cameraSimulcastEncodingsForDevice(): RtpEncodingParameters[] {
  return isMobileRtcCaptureProfile()
    ? CAMERA_VIDEO_SIMULCAST_ENCODINGS_MOBILE
    : CAMERA_VIDEO_SIMULCAST_ENCODINGS;
}

// ─── Screen share (single layer) ─────────────────────────────────────────────

export const SCREEN_VIDEO_ENCODINGS: RtpEncodingParameters[] = [{ maxBitrate: 3_500_000 }];

export const SCREEN_VIDEO_ENCODINGS_MOBILE: RtpEncodingParameters[] = [{ maxBitrate: 1_800_000 }];

export function screenVideoEncodingsForDevice(): RtpEncodingParameters[] {
  return isMobileRtcCaptureProfile() ? SCREEN_VIDEO_ENCODINGS_MOBILE : SCREEN_VIDEO_ENCODINGS;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Hints to the encoder: moving faces vs static text/UI (not supported everywhere). */
export function setVideoTrackContentHint(track: MediaStreamTrack, hint: "motion" | "detail"): void {
  try {
    track.contentHint = hint;
  } catch {
    /* ignore */
  }
}

/**
 * Try layered `produce` first; some Safari / codec combos reject simulcast — fall back to one layer.
 */
export async function produceOutboundVideo(
  sendTransport: Transport,
  track: MediaStreamTrack,
  appData: Record<string, unknown>,
  encodings: RtpEncodingParameters[] | undefined,
): Promise<Producer> {
  if (encodings?.length) {
    try {
      return await sendTransport.produce({ track, encodings, appData });
    } catch (err) {
      console.warn("[RTC] layered produce failed, falling back to single encoding", err);
    }
  }
  return sendTransport.produce({ track, appData });
}
