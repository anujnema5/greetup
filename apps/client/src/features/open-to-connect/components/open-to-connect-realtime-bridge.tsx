"use client";

import { useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { stashSpaceRoomBootstrap } from "@/features/matching/lib/space-room-bootstrap";
import { prefetchRoomDetail } from "@/features/room/api/room.queries";
import { prefetchRtcLiveSessionChunk } from "@/features/rtc/lib/prefetch-rtc-live-session-chunk";
import { setRoomReturnPath } from "@/features/room";
import { spaceRoomPath } from "@/features/room/lib/navigation/space-routes";
import { useSocket } from "@/lib/socket";
import { queryKeys } from "@/lib/query/keys";

import type {
  OtcRequestReceivedSocketPayload,
  OtcRequestRespondedSocketPayload,
} from "../types/connect-requests.types";
import type {
  OtcFeedUserAvailableSocketPayload,
  OtcFeedUserUnavailableSocketPayload,
} from "../types/open-to-connect-socket.types";
import {
  removeOpenNowPersonFromCaches,
  upsertOpenNowPersonInCaches,
} from "../lib/patch-open-now-feed-cache";

export function OpenToConnectRealtimeBridge() {
  const { socket } = useSocket();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const invalidate = () => {
      void qc.invalidateQueries({ queryKey: queryKeys.openToConnect.inboundRequests });
      void qc.invalidateQueries({ queryKey: queryKeys.openToConnect.outboundRequests });
      void qc.invalidateQueries({ queryKey: queryKeys.openToConnect.all });
    };

    const onRequestReceived = (payload?: OtcRequestReceivedSocketPayload) => {
      invalidate();
    };

    const onRequestResponded = (payload?: OtcRequestRespondedSocketPayload) => {
      invalidate();
      if (!payload?.accepted || !payload.roomId) return;

      setRoomReturnPath(pathname);
      stashSpaceRoomBootstrap(payload.roomId, {
        peerId: payload.peerUserId,
        score: null,
      });
      void prefetchRoomDetail(qc, payload.roomId);
      prefetchRtcLiveSessionChunk();
      const target = spaceRoomPath(payload.roomId);
      startTransition(() => {
        router.push(target);
      });
    };

    const onRequestCancelled = () => {
      invalidate();
    };

    const onFeedUserAvailable = (payload?: OtcFeedUserAvailableSocketPayload) => {
      if (!payload?.userId) return;
      upsertOpenNowPersonInCaches(qc, payload);
    };

    const onFeedUserUnavailable = (payload?: OtcFeedUserUnavailableSocketPayload) => {
      if (!payload?.userId) return;
      removeOpenNowPersonFromCaches(qc, payload);
    };

    socket.on("otc:request_received", onRequestReceived);
    socket.on("otc:request_responded", onRequestResponded);
    socket.on("otc:request_cancelled", onRequestCancelled);
    socket.on("otc:feed_user_available", onFeedUserAvailable);
    socket.on("otc:feed_user_unavailable", onFeedUserUnavailable);

    return () => {
      socket.off("otc:request_received", onRequestReceived);
      socket.off("otc:request_responded", onRequestResponded);
      socket.off("otc:request_cancelled", onRequestCancelled);
      socket.off("otc:feed_user_available", onFeedUserAvailable);
      socket.off("otc:feed_user_unavailable", onFeedUserUnavailable);
    };
  }, [socket, qc, router, pathname, startTransition]);

  return null;
}
