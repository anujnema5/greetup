"use client";

import { useMemo } from "react";

export type RoomVideoToolbarSecondaryId =
  | "chat"
  | "participants"
  | "activities"
  | "live"
  | "add"
  | "circleOptions"
  | "skip";

type SecondariesInput = {
  conversationId: string | null;
  isGroupRoom: boolean;
  showAddToCircle: boolean;
  onOpenAddToCircle?: () => void;
  showCircleOptions: boolean;
  onOpenCircleOptions?: () => void;
  showSkip: boolean;
  showPeopleTab: boolean;
  /** Direct call: omit when the DB catalog has no `is_active` embedded activities. */
  showActivitiesTab: boolean;
};

/**
 * Builds ordered secondary toolbar ids (chat, add, …) and a narrow variant that pulls
 * chat + add to the front for the phone scroll strip.
 */
export function useRoomVideoToolbarSecondaries(
  narrowToolbar: boolean,
  input: SecondariesInput,
): {
  skipPinnedMobile: boolean;
  toolbarFlowSecondaries: RoomVideoToolbarSecondaryId[];
} {
  const skipPinnedMobile = input.showSkip && narrowToolbar;

  const secondaryActions = useMemo((): RoomVideoToolbarSecondaryId[] => {
    const items: RoomVideoToolbarSecondaryId[] = [];
    if (input.showPeopleTab) items.push("participants");
    if (input.conversationId) items.push("chat");
    if (!input.isGroupRoom && input.showActivitiesTab) items.push("activities");
    if (!input.isGroupRoom) items.push("live");
    if (input.showAddToCircle && input.onOpenAddToCircle) items.push("add");
    if (input.showCircleOptions && input.onOpenCircleOptions) items.push("circleOptions");
    if (input.showSkip) items.push("skip");
    return items;
  }, [
    input.conversationId,
    input.isGroupRoom,
    input.showAddToCircle,
    input.onOpenAddToCircle,
    input.showCircleOptions,
    input.onOpenCircleOptions,
    input.showSkip,
    input.showPeopleTab,
    input.showActivitiesTab,
  ]);

  const flowSecondaries = useMemo(
    () =>
      secondaryActions.filter((id) => {
        if (skipPinnedMobile && id === "skip") return false;
        if (narrowToolbar && !input.isGroupRoom && (id === "activities" || id === "participants")) {
          return false;
        }
        return true;
      }),
    [secondaryActions, skipPinnedMobile, narrowToolbar, input.isGroupRoom],
  );

  const toolbarFlowSecondaries = useMemo((): RoomVideoToolbarSecondaryId[] => {
    if (!narrowToolbar) return flowSecondaries;
    const rest = flowSecondaries.filter((id) => id !== "chat" && id !== "add");
    const front: RoomVideoToolbarSecondaryId[] = [];
    if (flowSecondaries.includes("chat")) front.push("chat");
    if (flowSecondaries.includes("add")) front.push("add");
    return [...front, ...rest];
  }, [flowSecondaries, narrowToolbar]);

  return { skipPinnedMobile, toolbarFlowSecondaries };
}
