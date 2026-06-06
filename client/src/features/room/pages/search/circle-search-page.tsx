"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import {
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
  selectRoomPhase,
  useRoomStore,
} from "@/features/room/state/room.store";
import { InCallContainer } from "@/features/room/call/shell/in-call-container";
import { CircleRouteLoadingShell } from "@/features/room/components/search/circle-route-loading-shell";
import { useRoomPageTabLease, useClientMounted } from "@/features/room/hooks";
import { CIRCLE_SEARCH_SEGMENT } from "@/features/room/lib/navigation/circle-routes";

/** Direct-call rematch UI at `/circle/search` (no room API until a match lands). */
export function CircleSearchPage() {
  const mounted = useClientMounted();
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const sessionActive = useRoomStore(selectIsVideoSessionActive);
  const roomPhase = useRoomStore(selectRoomPhase);
  const isMinimized = useRoomStore(selectIsRoomMinimized);
  const isSearchingNext = roomPhase === "searching";

  const { duplicateTabRedirect } = useRoomPageTabLease({
    roomId: CIRCLE_SEARCH_SEGMENT,
    currentUserId: session?.user?.id ?? null,
    sessionPending,
    router,
  });

  useEffect(() => {
    if (!mounted || duplicateTabRedirect) return;
    if (sessionActive || isSearchingNext) return;
    router.replace("/home");
  }, [mounted, duplicateTabRedirect, sessionActive, isSearchingNext, router]);

  const showCallSurface = (sessionActive || isSearchingNext) && !isMinimized;

  if (!mounted || sessionPending) {
    return <CircleRouteLoadingShell />;
  }

  if (duplicateTabRedirect) {
    return <CircleRouteLoadingShell message="Redirecting…" />;
  }

  if (!showCallSurface) {
    return <CircleRouteLoadingShell />;
  }

  return (
    <InCallContainer
      key={CIRCLE_SEARCH_SEGMENT}
      roomId={CIRCLE_SEARCH_SEGMENT}
      peerId={null}
      scoreLabel={null}
      myName="You"
      isGroupRoom={false}
      circleDisplayTitle={null}
      circleCanEditTitle={false}
      circleHostUserId={null}
      circleLobbyGateActive={null}
      circleScheduledStartAt={null}
      circleRoomStatus={null}
      isDbCircleCall={false}
    />
  );
}
