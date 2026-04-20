"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/features/chat/components/chat-panel";
import { DIRECT_ROOM_ACTIVITIES } from "@/features/room/constants/direct-room-activities";
import type { RoomActivityId } from "@/features/room/types/room-activity.types";
import type { RoomActiveActivity } from "@/lib/redux/types/room-slice.types";

type RightPanelTab = "chat" | "activities";

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
}: {
  rightPanelTab: RightPanelTab;
  setRightPanelTab: (tab: RightPanelTab) => void;
  isGroupRoom: boolean;
  isLive: boolean;
  conversationId: string | null;
  activeActivity: RoomActivityId | null;
  setActiveActivity: (activity: RoomActivityId) => void;
  activeRealtimeActivity: RoomActiveActivity | null;
  onRequestChessInvite?: () => void;
  requestChessBusy?: boolean;
}) {
  const chessActive = activeRealtimeActivity?.kind === "chess";

  return (
    <aside className="flex h-[36vh] min-h-0 min-w-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/92 backdrop-blur-md sm:h-[40vh] lg:h-auto lg:w-88">
      <Tabs
        value={rightPanelTab}
        onValueChange={(value) => {
          if (value === "chat" || (!isGroupRoom && value === "activities")) {
            setRightPanelTab(value);
          }
        }}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
          <TabsList className="h-auto rounded-md border border-border/60 bg-muted/70 p-0.5">
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

        <TabsContent value="chat" className="mt-0">
          {conversationId ? (
            <ChatPanel
              conversationId={conversationId}
              conversationType={isGroupRoom ? "room_circle" : "room_direct"}
              showQuickReactions
            />
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Chat will appear once this room conversation is available.
            </div>
          )}
        </TabsContent>

        {!isGroupRoom ? (
          <TabsContent value="activities" className="mt-0">
            <div className="grid grid-cols-2 gap-2.5 p-3">
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
                    setRightPanelTab("chat");
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
    </aside>
  );
}
