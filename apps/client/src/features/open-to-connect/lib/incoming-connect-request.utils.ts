import type {
  ConnectRequestItem,
  ConnectRequesterPreview,
  IncomingConnectRequest,
  OtcRequestReceivedSocketPayload,
} from "../types/connect-requests.types";
import type { OpenNowFeedItem } from "../types/open-to-connect.types";

const EMPTY_PREVIEW: ConnectRequesterPreview = {
  headline: null,
  activities: [],
  lookingFor: [],
  profession: null,
  sharedInterests: [],
};

export function normalizeIncomingConnectRequest(
  payload: OtcRequestReceivedSocketPayload,
): IncomingConnectRequest {
  return {
    ...payload,
    headline: payload.headline ?? null,
    activities: payload.activities ?? [],
    lookingFor: payload.lookingFor ?? [],
    profession: payload.profession ?? null,
    sharedInterests: payload.sharedInterests ?? [],
  };
}

export function connectRequestItemToIncoming(item: ConnectRequestItem): IncomingConnectRequest {
  const preview = item.requesterPreview ?? EMPTY_PREVIEW;
  return {
    requestId: item.id,
    requesterUserId: item.peer.userId,
    requesterUsername: item.peer.username,
    requesterDisplayName: item.peer.displayName,
    requesterImage: item.peer.image,
    message: item.message,
    expiresAt: item.expiresAt,
    headline: preview.headline,
    activities: preview.activities,
    lookingFor: preview.lookingFor,
    profession: preview.profession,
    sharedInterests: preview.sharedInterests,
  };
}

export function incomingConnectRequestLabel(request: IncomingConnectRequest): string {
  return (
    request.requesterDisplayName?.trim() ||
    request.requesterUsername ||
    "Someone"
  );
}

export function incomingConnectRequestNote(request: IncomingConnectRequest): string | null {
  const note = request.message?.trim();
  if (!note) return null;
  const headline = request.headline?.trim();
  if (headline && headline === note) return null;
  return note;
}

export function incomingConnectRequestToFeedItem(request: IncomingConnectRequest): OpenNowFeedItem {
  const label = incomingConnectRequestLabel(request);
  return {
    userId: request.requesterUserId,
    username: request.requesterUsername,
    displayName: request.requesterDisplayName,
    name: label,
    image: request.requesterImage,
    headline: request.headline,
    activities: request.activities,
    lookingFor: request.lookingFor,
    profession: request.profession,
    sharedInterestCount: request.sharedInterests.length,
    sharedInterests: request.sharedInterests,
    isOnline: true,
  };
}
