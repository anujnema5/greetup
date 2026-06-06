import type { RoomActivityId } from "@/features/room/types/call/room-activity.types";
import type { EmbeddedCallPolicyLookup } from "@/features/room/embedded-activities";
import { resolveEmbeddedActivityCallPolicy } from "@/features/room/embedded-activities";
import type { RoomActiveActivity } from "@/features/room/types/room-state.types";

export type CallRoomKind = "direct" | "circle";

export type CallLayoutMode =
  | "direct-1v1"
  | "direct-solo"
  | "circle-grid"
  | "circle-gallery"
  | "screen-share-main"
  | "activity";

export type CallCapabilities = {
  roomKind: CallRoomKind;
  layoutMode: CallLayoutMode;
  isGroupRoom: boolean;
  showPeopleTab: boolean;
  showActivitiesTab: boolean;
  canInvite: boolean;
  suppressSidePanelCameras: boolean;
  participantCount: number;
  activeActivityId: RoomActivityId | null;
  hasScreenShare: boolean;
  canRecord: boolean;
  canReact: boolean;
  canScreenShare: boolean;
};

export type BuildCallCapabilitiesInput = {
  isGroupRoom: boolean;
  participantCount: number;
  activeActivityId: RoomActivityId | null;
  activeRealtimeActivity: RoomActiveActivity | null;
  embeddedPolicyLookup: EmbeddedCallPolicyLookup | null;
  showActivitiesTab: boolean;
  hasScreenShare: boolean;
  directSoloLayout?: boolean;
  useCircleGallery?: boolean;
};

export function resolveCallLayoutMode(input: BuildCallCapabilitiesInput): CallLayoutMode {
  if (input.activeActivityId) return "activity";
  if (input.hasScreenShare && input.isGroupRoom) return "screen-share-main";
  if (!input.isGroupRoom) {
    return input.directSoloLayout ? "direct-solo" : "direct-1v1";
  }
  if (input.useCircleGallery) return "circle-gallery";
  return "circle-grid";
}

export function buildCallCapabilities(input: BuildCallCapabilitiesInput): CallCapabilities {
  const policy = resolveEmbeddedActivityCallPolicy({
    stageActivityId: input.activeActivityId,
    synchronizedActivity: input.activeRealtimeActivity,
    policyByActivity: input.embeddedPolicyLookup,
  });

  return {
    roomKind: input.isGroupRoom ? "circle" : "direct",
    layoutMode: resolveCallLayoutMode(input),
    isGroupRoom: input.isGroupRoom,
    showPeopleTab:
      !policy.hidePeopleTab &&
      (input.hasScreenShare || input.activeActivityId != null),
    showActivitiesTab: input.showActivitiesTab,
    canInvite: !policy.blockParticipantInvites,
    suppressSidePanelCameras: policy.suppressPeoplePanelCameras,
    participantCount: input.participantCount,
    activeActivityId: input.activeActivityId,
    hasScreenShare: input.hasScreenShare,
    canRecord: false,
    canReact: false,
    canScreenShare: true,
  };
}
