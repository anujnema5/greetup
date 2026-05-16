import type { CreateCircleAdvancedOptions } from "./circles-api.types";

/** Defaults for advanced options in the start-circle form (matches API null → sensible UI). */
export const DEFAULT_START_CIRCLE_ADVANCED = {
  shouldHostStartMeeting: false,
  shouldMeetingAutoStart: true,
  circleExpirationMinutes: "",
  deleteCircleAfterCall: false,
  hostControlsActiveSpeaker: false,
} as const;

/** Local-only advanced options; `circleExpirationMinutes` may be "" while editing. */
export type StartCircleAdvancedFormState = {
  shouldHostStartMeeting: boolean;
  shouldMeetingAutoStart: boolean;
  circleExpirationMinutes: string;
  deleteCircleAfterCall: boolean;
  hostControlsActiveSpeaker: boolean;
};

/**
 * Host-lobby and lazy auto-start are mutually exclusive (matches server `mergeRoomAdvancedOptions`).
 * Same two-step rule: auto-on forces host-start off; if the host still opens the circle manually, auto-start off.
 */
export function normalizeMeetingStartExclusivity(
  shouldHostStartMeeting: boolean,
  shouldMeetingAutoStart: boolean,
): { shouldHostStartMeeting: boolean; shouldMeetingAutoStart: boolean } {
  let h = shouldHostStartMeeting;
  let a = shouldMeetingAutoStart;
  if (a) h = false;
  if (h) a = false;
  return { shouldHostStartMeeting: h, shouldMeetingAutoStart: a };
}

export function toApiAdvancedOptions(
  adv: StartCircleAdvancedFormState,
): CreateCircleAdvancedOptions {
  const expRaw = adv.circleExpirationMinutes;
  const circleExpirationMinutes =
    expRaw === "" || expRaw === undefined
      ? null
      : Math.min(10080, Math.max(1, Number(expRaw)));
  const { shouldHostStartMeeting, shouldMeetingAutoStart } = normalizeMeetingStartExclusivity(
    adv.shouldHostStartMeeting,
    adv.shouldMeetingAutoStart,
  );
  return {
    shouldHostStartMeeting,
    shouldMeetingAutoStart,
    circleExpirationMinutes,
    deleteCircleAfterCall: adv.deleteCircleAfterCall,
    hostControlsActiveSpeaker: adv.hostControlsActiveSpeaker,
  };
}

export function advancedOptionsFromApi(
  api: CreateCircleAdvancedOptions | null | undefined,
): StartCircleAdvancedFormState {
  if (!api) {
    return { ...DEFAULT_START_CIRCLE_ADVANCED };
  }
  const host =
    api.shouldHostStartMeeting ?? DEFAULT_START_CIRCLE_ADVANCED.shouldHostStartMeeting;
  const auto =
    api.shouldMeetingAutoStart ?? DEFAULT_START_CIRCLE_ADVANCED.shouldMeetingAutoStart;
  const { shouldHostStartMeeting, shouldMeetingAutoStart } = normalizeMeetingStartExclusivity(
    host,
    auto,
  );
  return {
    shouldHostStartMeeting,
    shouldMeetingAutoStart,
    circleExpirationMinutes:
      api.circleExpirationMinutes == null || api.circleExpirationMinutes === undefined
        ? ""
        : String(api.circleExpirationMinutes),
    deleteCircleAfterCall:
      api.deleteCircleAfterCall ?? DEFAULT_START_CIRCLE_ADVANCED.deleteCircleAfterCall,
    hostControlsActiveSpeaker:
      api.hostControlsActiveSpeaker ??
      DEFAULT_START_CIRCLE_ADVANCED.hostControlsActiveSpeaker,
  };
}
