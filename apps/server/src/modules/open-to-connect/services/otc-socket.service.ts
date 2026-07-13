import { emitToUser } from "@/core/socket/socket";

import type { OpenToConnectActivityTagDto } from "../types";

export type OtcRequestReceivedPayload = {
  requestId: string;
  requesterUserId: string;
  requesterUsername: string;
  requesterDisplayName: string | null;
  requesterImage: string | null;
  message: string | null;
  expiresAt: string;
  headline: string | null;
  activities: OpenToConnectActivityTagDto[];
  lookingFor: string[];
  profession: string | null;
  sharedInterests: string[];
};

export type OtcRequestRespondedPayload = {
  requestId: string;
  accepted: boolean;
  roomId?: string;
  peerUserId: string;
};

export type OtcRequestCancelledPayload = {
  requestId: string;
};

/** Realtime open-now feed card — shared interests are computed per viewer on the client. */
export type OtcFeedUserAvailablePayload = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  headline: string | null;
  activities: OpenToConnectActivityTagDto[];
  lookingFor: string[];
  profession: string | null;
  interestIds: string[];
  interestLabels: Record<string, string>;
};

export type OtcFeedUserUnavailablePayload = {
  userId: string;
};

export type OtcCallEndedPayload = {
  roomId: string;
  endedByUserId: string;
};

export const OTC_SOCKET_EVENTS = {
  callEnded: "otc:call_ended",
} as const;

export const otcSocketService = {
  emitRequestReceived(targetUserId: string, payload: OtcRequestReceivedPayload) {
    emitToUser(targetUserId, "otc:request_received", payload);
  },

  emitRequestResponded(userId: string, payload: OtcRequestRespondedPayload) {
    emitToUser(userId, "otc:request_responded", payload);
  },

  emitRequestCancelled(targetUserId: string, payload: OtcRequestCancelledPayload) {
    emitToUser(targetUserId, "otc:request_cancelled", payload);
  },

  emitFeedUserAvailable(viewerId: string, payload: OtcFeedUserAvailablePayload) {
    emitToUser(viewerId, "otc:feed_user_available", payload);
  },

  emitFeedUserUnavailable(viewerId: string, payload: OtcFeedUserUnavailablePayload) {
    emitToUser(viewerId, "otc:feed_user_unavailable", payload);
  },

  emitCallEnded(peerUserId: string, payload: OtcCallEndedPayload) {
    emitToUser(peerUserId, OTC_SOCKET_EVENTS.callEnded, payload);
  },
};
