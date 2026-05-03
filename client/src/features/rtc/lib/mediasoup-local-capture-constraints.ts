/**
 * `MediaTrackConstraints` passed to `getUserMedia` / `getDisplayMedia` before we `produce`.
 *
 * Mobile profile uses lower resolution and fps to reduce thermal throttling and UI jank on phones.
 * Encoding layers (simulcast bitrates) are separate — see `mediasoup-produce-config.ts`.
 */

import { isMobileRtcCaptureProfile } from "@/features/rtc/lib/rtc-mobile-profile";

const CAMERA_DESKTOP: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 30 },
};

const CAMERA_MOBILE: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 640, max: 960 },
  height: { ideal: 480, max: 540 },
  frameRate: { ideal: 24, max: 24 },
};

const SCREEN_DESKTOP: MediaTrackConstraints = {
  frameRate: { ideal: 30, max: 30 },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

const SCREEN_MOBILE: MediaTrackConstraints = {
  frameRate: { ideal: 24, max: 30 },
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
};

export function getCameraCaptureConstraints(): MediaTrackConstraints {
  return isMobileRtcCaptureProfile() ? CAMERA_MOBILE : CAMERA_DESKTOP;
}

export function getScreenCaptureConstraints(): MediaTrackConstraints {
  return isMobileRtcCaptureProfile() ? SCREEN_MOBILE : SCREEN_DESKTOP;
}
