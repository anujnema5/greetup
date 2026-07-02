import type { CreateSpaceAdvancedOptions } from "./spaces-api.types";

/** Defaults for advanced options in the start-space form (matches API null → sensible UI). */
export const DEFAULT_START_SPACE_ADVANCED = {
  shouldHostStartMeeting: false,
  shouldMeetingAutoStart: true,
  spaceExpirationMinutes: "",
  deleteSpaceAfterCall: false,
  hostControlsActiveSpeaker: false,
} as const;

/** Local-only advanced options; `spaceExpirationMinutes` may be "" while editing. */
export type StartSpaceAdvancedFormState = {
  shouldHostStartMeeting: boolean;
  shouldMeetingAutoStart: boolean;
  spaceExpirationMinutes: string;
  deleteSpaceAfterCall: boolean;
  hostControlsActiveSpeaker: boolean;
};

/**
 * Host-lobby and lazy auto-start are mutually exclusive (matches server `mergeRoomAdvancedOptions`).
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
  adv: StartSpaceAdvancedFormState,
): CreateSpaceAdvancedOptions {
  const expRaw = adv.spaceExpirationMinutes;
  const spaceExpirationMinutes =
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
    spaceExpirationMinutes,
    deleteSpaceAfterCall: adv.deleteSpaceAfterCall,
    hostControlsActiveSpeaker: adv.hostControlsActiveSpeaker,
  };
}

export function advancedOptionsFromApi(
  api: CreateSpaceAdvancedOptions | null | undefined,
): StartSpaceAdvancedFormState {
  if (!api) {
    return { ...DEFAULT_START_SPACE_ADVANCED };
  }
  const host =
    api.shouldHostStartMeeting ?? DEFAULT_START_SPACE_ADVANCED.shouldHostStartMeeting;
  const auto =
    api.shouldMeetingAutoStart ?? DEFAULT_START_SPACE_ADVANCED.shouldMeetingAutoStart;
  const { shouldHostStartMeeting, shouldMeetingAutoStart } = normalizeMeetingStartExclusivity(
    host,
    auto,
  );
  const exp = api.spaceExpirationMinutes;
  return {
    shouldHostStartMeeting,
    shouldMeetingAutoStart,
    spaceExpirationMinutes:
      exp == null || exp === undefined ? "" : String(exp),
    deleteSpaceAfterCall:
      api.deleteSpaceAfterCall ?? DEFAULT_START_SPACE_ADVANCED.deleteSpaceAfterCall,
    hostControlsActiveSpeaker:
      api.hostControlsActiveSpeaker ??
      DEFAULT_START_SPACE_ADVANCED.hostControlsActiveSpeaker,
  };
}
