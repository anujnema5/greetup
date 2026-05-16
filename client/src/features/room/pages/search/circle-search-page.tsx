"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
  selectRoomPhase,
} from "@/lib/redux/selectors/room-selectors";
import { InCallContainer } from "@/features/room/call/shell/in-call-container";
import { CircleRouteLoadingShell } from "@/features/room/components/search/circle-route-loading-shell";
import { useRoomPageTabLease, useClientMounted } from "@/features/room/hooks";
import { CIRCLE_SEARCH_SEGMENT } from "@/features/room/lib/navigation/circle-routes";

/** Direct-call rematch UI at `/circle/search` (no room API until a match lands). */
export function CircleSearchPage() {
  const mounted = useClientMounted();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: session, isPending: sessionPending } = useSession();
  const sessionActive = useAppSelector(selectIsVideoSessionActive);
  const roomPhase = useAppSelector(selectRoomPhase);
  const isMinimized = useAppSelector(selectIsRoomMinimized);
  const isSearchingNext = roomPhase === "searching";

  const { duplicateTabRedirect } = useRoomPageTabLease({
    roomId: CIRCLE_SEARCH_SEGMENT,
    currentUserId: session?.user?.id ?? null,
    sessionPending,
    dispatch,
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
