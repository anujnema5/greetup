import { emitToUser } from "@/core/socket/socket";
import { getRedis } from "@/core/redis";
import { USER_PRESENCE_KEYS } from "@/core/redis/keys";
import { getAcceptedPeerIdsForUser } from "@/modules/connections/services/accepted-peer-ids.service";
import { peersCallStatusForUser } from "@/modules/connections/services/peers-call-status.service";
import {
  canHostInviteUserToRoom,
  getRoomInvitePreferencesForUsers,
} from "@/modules/profile/services/room-invite-preferences.service";
import { DIRECT_EXPAND_SOCKET_EVENTS } from "@/modules/rooms/constants/direct-expand-socket.events";
import {
  DirectRoomExpandConflictError,
  expandDirectRoomRepository,
} from "@/modules/rooms/repositories/expand-direct-room.repository";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { notifyRtcServiceRoomType } from "@/modules/rooms/services/notify-rtc-room-type.service";
import { patchSessionRoomRedisRoomType } from "@/modules/rooms/services/session-room-redis.service";

export class ExpandDirectRoomError extends Error {
  constructor(
    message: string,
    public readonly code: ExpandDirectRoomErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ExpandDirectRoomError";
  }
}

export type ExpandDirectRoomErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_NOT_LIVE"
  | "NOT_DIRECT"
  | "NOT_PARTICIPANT"
  | "NOT_CONNECTION"
  | "INVITE_BLOCKED"
  | "INVITEE_OFFLINE"
  | "INVITEE_BUSY"
  | "ALREADY_IN_ROOM"
  | "INVITE_NOT_FOUND"
  | "NOT_YOUR_INVITE"
  | "INVITE_NOT_PENDING"
  | "ROOM_CHANGED";

export async function createExpandDirectInviteService(
  inviterUserId: string,
  roomId: string,
  inviteeUserId: string,
): Promise<{ inviteId: string }> {
  if (inviteeUserId === inviterUserId) {
    throw new ExpandDirectRoomError("Invalid invitee", "NOT_CONNECTION", 400);
  }

  const room = await roomsRepository.findRoomById(roomId);
  if (!room) {
    throw new ExpandDirectRoomError("Room not found", "ROOM_NOT_FOUND", 404);
  }
  if (room.status !== "live") {
    throw new ExpandDirectRoomError("Room is not live", "ROOM_NOT_LIVE", 400);
  }
  if (room.roomType !== "direct") {
    throw new ExpandDirectRoomError("Only direct calls can be expanded this way", "NOT_DIRECT", 400);
  }

  const inviterOk = await roomsRepository.isUserRoomParticipant(roomId, inviterUserId);
  if (!inviterOk) {
    throw new ExpandDirectRoomError("You are not in this room", "NOT_PARTICIPANT", 403);
  }

  const peers = await getAcceptedPeerIdsForUser(inviterUserId);
  if (!peers.has(inviteeUserId)) {
    throw new ExpandDirectRoomError("You are not connected with this person", "NOT_CONNECTION", 403);
  }

  const prefsMap = await getRoomInvitePreferencesForUsers([inviteeUserId]);
  const inviteePrefs = prefsMap.get(inviteeUserId)!;
  if (!canHostInviteUserToRoom(inviterUserId, inviteePrefs)) {
    throw new ExpandDirectRoomError(
      "This person does not accept invites from you",
      "INVITE_BLOCKED",
      403,
    );
  }

  const redis = getRedis();
  const online = (await redis.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, inviteeUserId)) === 1;
  if (!online) {
    throw new ExpandDirectRoomError("User is offline", "INVITEE_OFFLINE", 400);
  }

  const statusMap = await peersCallStatusForUser(inviterUserId, [inviteeUserId]);
  const st = statusMap[inviteeUserId];
  if (st?.inLiveRoom && st.liveRoomId && st.liveRoomId !== roomId) {
    throw new ExpandDirectRoomError("User is already in another call", "INVITEE_BUSY", 400);
  }

  if (await roomsRepository.isUserRoomParticipant(roomId, inviteeUserId)) {
    throw new ExpandDirectRoomError("User is already in this room", "ALREADY_IN_ROOM", 400);
  }

  const existing = await expandDirectRoomRepository.findFriendInviteByRoomAndInvitee(
    roomId,
    inviteeUserId,
  );

  if (existing?.status === "pending") {
    await emitInviteSocket(existing.id, roomId, inviterUserId, inviteeUserId, room.title);
    return { inviteId: existing.id };
  }
  if (existing?.status === "accepted") {
    throw new ExpandDirectRoomError("An invite for this user is already accepted", "ALREADY_IN_ROOM", 400);
  }

  const inviteId = await expandDirectRoomRepository.upsertPendingFriendInvite({
    roomId,
    inviterUserId,
    inviteeUserId,
  });
  if (!inviteId) {
    throw new ExpandDirectRoomError("Could not create invite", "ROOM_NOT_FOUND", 500);
  }

  await emitInviteSocket(inviteId, roomId, inviterUserId, inviteeUserId, room.title);
  return { inviteId };
}

async function emitInviteSocket(
  inviteId: string,
  roomId: string,
  inviterUserId: string,
  inviteeUserId: string,
  roomTitle: string,
): Promise<void> {
  const inviterDisplayName = await expandDirectRoomRepository.findDisplayLabelForUser(inviterUserId);
  const others = (await roomsRepository.listActiveParticipantUserIds(roomId)).filter(
    (id) => id !== inviteeUserId,
  );
  const names: string[] = [];
  for (const uid of others) {
    names.push(await expandDirectRoomRepository.findDisplayLabelForUser(uid));
  }

  emitToUser(inviteeUserId, DIRECT_EXPAND_SOCKET_EVENTS.invite, {
    inviteId,
    roomId,
    inviterUserId,
    inviterDisplayName,
    roomTitle,
    currentParticipantNames: names,
  });
}

export async function respondExpandDirectInviteService(
  inviteeUserId: string,
  inviteId: string,
  accept: boolean,
): Promise<{ roomId: string; expanded: boolean }> {
  const invite = await expandDirectRoomRepository.findFriendInviteById(inviteId);

  if (!invite) {
    throw new ExpandDirectRoomError("Invite not found", "INVITE_NOT_FOUND", 404);
  }
  if (invite.inviteeUserId !== inviteeUserId) {
    throw new ExpandDirectRoomError("This invite is not for you", "NOT_YOUR_INVITE", 403);
  }
  if (invite.status !== "pending") {
    throw new ExpandDirectRoomError("This invite is no longer pending", "INVITE_NOT_PENDING", 400);
  }

  const roomId = invite.roomId;

  if (!accept) {
    await expandDirectRoomRepository.setFriendInviteDeclined(inviteId);
    emitToUser(invite.inviterUserId, DIRECT_EXPAND_SOCKET_EVENTS.declined, {
      inviteId,
      roomId,
      inviteeUserId,
    });
    return { roomId, expanded: false };
  }

  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.status !== "live") {
    throw new ExpandDirectRoomError("Room is no longer available", "ROOM_NOT_LIVE", 400);
  }
  if (room.roomType !== "direct") {
    throw new ExpandDirectRoomError("This call was already expanded", "ROOM_CHANGED", 400);
  }

  try {
    await expandDirectRoomRepository.runExpandDirectAcceptTransaction({
      roomId,
      inviteId,
      inviteeUserId,
      inviterUserId: invite.inviterUserId,
      currentMaxParticipants: room.maxParticipants,
    });
  } catch (err) {
    if (err instanceof DirectRoomExpandConflictError) {
      throw new ExpandDirectRoomError("This call was already expanded", "ROOM_CHANGED", 409);
    }
    throw err;
  }

  await patchSessionRoomRedisRoomType(roomId, "circle");

  void notifyRtcServiceRoomType(roomId, "circle");

  const notifyIds = await roomsRepository.listActiveParticipantUserIds(roomId);
  for (const uid of notifyIds) {
    emitToUser(uid, DIRECT_EXPAND_SOCKET_EVENTS.becameCircle, { roomId });
  }

  return { roomId, expanded: true };
}
