"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/features/chat/components/chat-panel";
import { DIRECT_ROOM_ACTIVITIES } from "@/features/room/constants/direct-room-activities";
import type { RoomActivityId } from "@/features/room/types/room-activity.types";
import type { RoomCallRightPanelTab } from "@/features/room/types/room-call-panel.types";
import type { RoomActiveActivity } from "@/lib/redux/types/room-slice.types";

export type RoomVideoRightPanelVariant = "dock" | "sheet";

export function RoomVideoRightPanel({
  rightPanelTab,
  setRightPanelTab,
  isGroupRoom,
  isLive,
  conversationId,
  activeActivity,
  setActiveActivity,
  activeRealtimeActivity,
  onRequestChessInvite,
  requestChessBusy,
  searchingForNextCandidate = false,
  showPeopleTab = false,
  participantsPanel = null,
  variant = "dock",
}: {
  rightPanelTab: RoomCallRightPanelTab;
  setRightPanelTab: (tab: RoomCallRightPanelTab) => void;
  isGroupRoom: boolean;
  isLive: boolean;
  conversationId: string | null;
  activeActivity: RoomActivityId | null;
  setActiveActivity: (activity: RoomActivityId) => void;
  activeRealtimeActivity: RoomActiveActivity | null;
  onRequestChessInvite?: () => void;
  requestChessBusy?: boolean;
  searchingForNextCandidate?: boolean;
  /** Screen share, circle chess, or direct in-room activity — People lists cameras (+ shares when present). */
  showPeopleTab?: boolean;
  participantsPanel?: ReactNode;
  variant?: RoomVideoRightPanelVariant;
}) {
  const chessActive = activeRealtimeActivity?.kind === "chess";

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden",
        variant === "dock" &&
          "h-full min-h-0 w-full flex-1 rounded-2xl border border-border/70 bg-card/92 backdrop-blur-md lg:max-h-none lg:w-88",
        variant === "sheet" &&
          "h-full max-h-[min(82dvh,800px)] w-full flex-1 rounded-none border-0 bg-card/95",
      )}
    >
      <Tabs
        value={rightPanelTab}
        onValueChange={(value) => {
          if (
            value === "chat" ||
            (value === "participants" && showPeopleTab) ||
            (!isGroupRoom && value === "activities")
          ) {
            setRightPanelTab(value as RoomCallRightPanelTab);
          }
        }}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-3 py-2">
          <TabsList className="h-auto max-w-full flex-wrap rounded-md border border-border/60 bg-muted/70 p-0.5">
            {showPeopleTab ? (
              <TabsTrigger value="participants" className="h-7 px-2.5 text-[12px] font-semibold">
                people
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="chat" className="h-7 px-2.5 text-[12px] font-semibold">
              chat
            </TabsTrigger>
            {!isGroupRoom ? (
              <TabsTrigger value="activities" className="h-7 px-2.5 text-[12px] font-semibold">
                activities
              </TabsTrigger>
            ) : null}
          </TabsList>
          {isLive ? (
            <span className="rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              LIVE
            </span>
          ) : null}
        </div>

        {showPeopleTab ? (
          <TabsContent
            value="participants"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            {participantsPanel}
          </TabsContent>
        ) : null}

        <TabsContent value="chat" className="mt-0 min-h-0 flex-1 overflow-y-auto">
          {conversationId ? (
            <ChatPanel
              conversationId={conversationId}
              conversationType={isGroupRoom ? "room_circle" : "room_direct"}
              showQuickReactions
              sendDisabled={!isGroupRoom && searchingForNextCandidate}
            />
          ) : (
            <div className="flex min-h-48 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Chat will appear once this room conversation is available.
            </div>
          )}
        </TabsContent>

        {!isGroupRoom ? (
          <TabsContent value="activities" className="mt-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden">
            <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-2 sm:gap-3">
              {DIRECT_ROOM_ACTIVITIES.map((activity) => (
                <Button
                  key={activity.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (activity.id === "chess") {
                      onRequestChessInvite?.();
                      return;
                    }
                    setActiveActivity(activity.id);
                    setRightPanelTab("participants");
                  }}
                  disabled={(activity.id === "chess" && requestChessBusy) || chessActive}
                  className={cn(
                    "flex h-auto aspect-[1.3/1] flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/35 p-2.5 text-center transition-all hover:bg-muted/60",
                    (activeActivity === activity.id || (activity.id === "chess" && chessActive)) &&
                      "border-primary/60 bg-primary/10",
                    activity.id === "chess" && requestChessBusy && "opacity-70",
                  )}
                >
                  <span className="text-[22px]">{activity.emoji}</span>
                  <span className="text-[12px] font-medium text-foreground">{activity.label}</span>
                </Button>
              ))}
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
