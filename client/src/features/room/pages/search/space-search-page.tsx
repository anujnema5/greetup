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
import { SpaceRouteLoadingShell } from "@/features/room/components/search/space-route-loading-shell";
import { useRoomPageTabLease, useClientMounted } from "@/features/room/hooks";
import { SPACE_SEARCH_SEGMENT } from "@/features/room/lib/navigation/space-routes";

/** Direct-call rematch UI at `/space/search` (no room API until a match lands). */
export function SpaceSearchPage() {
  const mounted = useClientMounted();
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const sessionActive = useRoomStore(selectIsVideoSessionActive);
  const roomPhase = useRoomStore(selectRoomPhase);
  const isMinimized = useRoomStore(selectIsRoomMinimized);
  const isSearchingNext = roomPhase === "searching";

  const { duplicateTabRedirect } = useRoomPageTabLease({
    roomId: SPACE_SEARCH_SEGMENT,
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
    return <SpaceRouteLoadingShell />;
  }

  if (duplicateTabRedirect) {
    return <SpaceRouteLoadingShell message="Redirecting…" />;
  }

  if (!showCallSurface) {
    return <SpaceRouteLoadingShell />;
  }

  return (
    <InCallContainer
      key={SPACE_SEARCH_SEGMENT}
      roomId={SPACE_SEARCH_SEGMENT}
      peerId={null}
      scoreLabel={null}
      myName="You"
      isGroupRoom={false}
      spaceDisplayTitle={null}
      spaceCanEditTitle={false}
      spaceHostUserId={null}
      spaceLobbyGateActive={null}
      spaceScheduledStartAt={null}
      spaceRoomStatus={null}
      isDbSpaceCall={false}
    />
  );
}
