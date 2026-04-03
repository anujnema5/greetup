import type { CreateCircleAdvancedOptions } from "./circles-api.types";

/** Local-only advanced options; `circleExpirationMinutes` may be "" while editing. */
export type StartCircleAdvancedFormState = {
  shouldHostStartMeeting: boolean;
  shouldMeetingAutoStart: boolean;
  circleExpirationMinutes: string | number;
  deleteCircleAfterCall: boolean;
  hostControlsActiveSpeaker: boolean;
};

export function toApiAdvancedOptions(
  adv: StartCircleAdvancedFormState,
): CreateCircleAdvancedOptions {
  const expRaw = adv.circleExpirationMinutes;
  const circleExpirationMinutes =
    expRaw === "" || expRaw === undefined
      ? null
      : Math.min(10080, Math.max(1, Number(expRaw)));
  return {
    shouldHostStartMeeting: adv.shouldHostStartMeeting,
    shouldMeetingAutoStart: adv.shouldMeetingAutoStart,
    circleExpirationMinutes,
    deleteCircleAfterCall: adv.deleteCircleAfterCall,
    hostControlsActiveSpeaker: adv.hostControlsActiveSpeaker,
  };
}

export const DEFAULT_START_CIRCLE_ADVANCED: StartCircleAdvancedFormState = {
  shouldHostStartMeeting: true,
  shouldMeetingAutoStart: false,
  circleExpirationMinutes: "",
  deleteCircleAfterCall: false,
  hostControlsActiveSpeaker: false,
};
