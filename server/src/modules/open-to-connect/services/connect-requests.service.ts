import { inArray } from "drizzle-orm";

import { db } from "@/core/database";
import { users } from "@/core/database/schema";
import { getRedis } from "@/core/redis";
import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";
import {
  getUserMatchStateService,
  cancelMatchService,
} from "@/modules/matching/services/matchmaking.service";
import { getUserActiveRtcRoomId } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";
import { AppError } from "@/shared/errors";

import {
  CONNECT_REQUEST_MAX_INBOUND_PENDING,
  CONNECT_REQUEST_OUTBOUND_RATE_LIMIT,
  CONNECT_REQUEST_RATE_KEY_PREFIX,
  CONNECT_REQUEST_REJECT_COOLDOWN_MS,
  CONNECT_REQUEST_TTL_MS,
} from "../constants";
import { connectRequestsRepository } from "../repositories/connect-requests.repository";
import { otcRedisIndexService } from "./otc-redis-index.service";
import { provisionOpenToConnectRoom } from "./provision-otc-room.service";
import { otcSocketService } from "./otc-socket.service";
import type { CreateConnectRequestBody } from "../schemas/connect-request.schema";

export type ConnectRequestPeerDto = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
};

export type ConnectRequestItemDto = {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  roomId: string | null;
  peer: ConnectRequestPeerDto;
};

async function assertUserNotBusy(userId: string, label: string): Promise<void> {
  const [matchState, activeRoomId] = await Promise.all([
    getUserMatchStateService(userId),
    getUserActiveRtcRoomId(userId),
  ]);
  if (activeRoomId || (matchState.status === "matched" && matchState.roomId)) {
    throw new AppError(`${label} is in a call right now`, 409, "CONFLICT");
  }
}

async function assertTargetIsOpen(targetUserId: string): Promise<void> {
  const visible = await otcRedisIndexService.isUserVisibleInDiscovery(targetUserId);
  if (!visible) {
    throw new AppError("That person is not open to connect right now", 400, "VALIDATION_ERROR");
  }
}

async function assertOutboundRateLimit(requesterUserId: string): Promise<void> {
  const redis = getRedis();
  const key = `${CONNECT_REQUEST_RATE_KEY_PREFIX}${requesterUserId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 3600);
  }
  if (count > CONNECT_REQUEST_OUTBOUND_RATE_LIMIT) {
    throw new AppError("Too many requests — try again later", 409, "CONFLICT");
  }
}

async function loadPeersByUserIds(userIds: string[]): Promise<Map<string, ConnectRequestPeerDto>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      name: users.name,
      image: users.image,
    })
    .from(users)
    .where(inArray(users.id, userIds));
  return new Map(
    rows.map((row) => [
      row.userId,
      {
        userId: row.userId,
        username: row.username,
        displayName: row.displayName,
        name: row.name,
        image: row.image,
      },
    ]),
  );
}

function toConnectRequestItemDto(
  row: {
    id: string;
    status: string;
    message: string | null;
    createdAt: Date;
    expiresAt: Date;
    respondedAt: Date | null;
    roomId: string | null;
    requesterUserId: string;
    targetUserId: string;
  },
  peer: ConnectRequestPeerDto,
): ConnectRequestItemDto {
  return {
    id: row.id,
    status: row.status,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
    roomId: row.roomId,
    peer,
  };
}

export async function createConnectRequestService(
  requesterUserId: string,
  body: CreateConnectRequestBody,
): Promise<ConnectRequestItemDto> {
  const targetUserId = body.targetUserId.trim();
  if (targetUserId === requesterUserId) {
    throw new AppError("You cannot request yourself", 400, "VALIDATION_ERROR");
  }

  if (await userBlocksRepository.isEitherBlocked(requesterUserId, targetUserId)) {
    throw new AppError("You cannot connect with this person", 403, "UNAUTHORIZED");
  }

  await assertUserNotBusy(requesterUserId, "You");
  await assertUserNotBusy(targetUserId, "They");
  await assertTargetIsOpen(targetUserId);

  const requesterState = await getUserMatchStateService(requesterUserId);
  if (requesterState.status === "searching" || requesterState.status === "proposed") {
    await cancelMatchService(requesterUserId);
  }

  const cooldownSince = new Date(Date.now() - CONNECT_REQUEST_REJECT_COOLDOWN_MS);
  const recentReject = await connectRequestsRepository.findRecentRejected(
    requesterUserId,
    targetUserId,
    cooldownSince,
  );
  if (recentReject) {
    throw new AppError("They declined recently — try again later", 409, "CONFLICT");
  }

  const existing = await connectRequestsRepository.findPendingBetween(requesterUserId, targetUserId);
  if (existing) {
    throw new AppError("You already have a pending request to this person", 409, "CONFLICT");
  }

  const inboundCount = await connectRequestsRepository.countInboundPending(targetUserId);
  if (inboundCount >= CONNECT_REQUEST_MAX_INBOUND_PENDING) {
    throw new AppError("They have too many pending requests right now", 409, "CONFLICT");
  }

  await assertOutboundRateLimit(requesterUserId);

  const expiresAt = new Date(Date.now() + CONNECT_REQUEST_TTL_MS);
  const message =
    body.message != null && body.message.trim() !== "" ? body.message.trim() : null;

  const row = await connectRequestsRepository.createPending({
    requesterUserId,
    targetUserId,
    message,
    expiresAt,
  });
  if (!row) {
    throw new AppError("Could not send request", 500, "INTERNAL_ERROR");
  }

  const peers = await loadPeersByUserIds([targetUserId, requesterUserId]);
  const requester = peers.get(requesterUserId);
  const target = peers.get(targetUserId);
  if (!requester || !target) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  otcSocketService.emitRequestReceived(targetUserId, {
    requestId: row.id,
    requesterUserId,
    requesterUsername: requester.username,
    requesterDisplayName: requester.displayName,
    requesterImage: requester.image,
    message,
    expiresAt: expiresAt.toISOString(),
  });

  return toConnectRequestItemDto(row, target);
}

export async function listInboundConnectRequestsService(
  targetUserId: string,
): Promise<ConnectRequestItemDto[]> {
  const rows = await connectRequestsRepository.listInboundPending(targetUserId);
  const peerIds = rows.map((row) => row.requesterUserId);
  const peers = await loadPeersByUserIds(peerIds);
  return rows
    .map((row) => {
      const peer = peers.get(row.requesterUserId);
      if (!peer) return null;
      return toConnectRequestItemDto(row, peer);
    })
    .filter((row): row is ConnectRequestItemDto => row !== null);
}

export async function listOutboundConnectRequestsService(
  requesterUserId: string,
): Promise<ConnectRequestItemDto[]> {
  const rows = await connectRequestsRepository.listOutboundRecent(requesterUserId);
  const peerIds = rows.map((row) => row.targetUserId);
  const peers = await loadPeersByUserIds(peerIds);
  return rows
    .map((row) => {
      const peer = peers.get(row.targetUserId);
      if (!peer) return null;
      return toConnectRequestItemDto(row, peer);
    })
    .filter((row): row is ConnectRequestItemDto => row !== null);
}

export async function cancelConnectRequestService(
  requesterUserId: string,
  requestId: string,
): Promise<void> {
  const row = await connectRequestsRepository.findById(requestId);
  if (!row || row.requesterUserId !== requesterUserId) {
    throw new AppError("Request not found", 404, "NOT_FOUND");
  }
  if (row.status !== "pending") {
    throw new AppError("Request is no longer pending", 409, "CONFLICT");
  }

  const updated = await connectRequestsRepository.respond(requestId, { status: "cancelled" });
  if (!updated) {
    throw new AppError("Request is no longer pending", 409, "CONFLICT");
  }

  otcSocketService.emitRequestCancelled(row.targetUserId, { requestId });
}

export async function respondConnectRequestService(
  targetUserId: string,
  requestId: string,
  accept: boolean,
): Promise<{ roomId: string | null }> {
  const row = await connectRequestsRepository.findById(requestId);
  if (!row || row.targetUserId !== targetUserId) {
    throw new AppError("Request not found", 404, "NOT_FOUND");
  }
  if (row.status !== "pending") {
    throw new AppError("Request is no longer pending", 409, "CONFLICT");
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    await connectRequestsRepository.respond(requestId, { status: "expired" });
    throw new AppError("Request expired", 409, "CONFLICT");
  }

  await assertUserNotBusy(targetUserId, "You");
  await assertUserNotBusy(row.requesterUserId, "They");

  if (!accept) {
    const updated = await connectRequestsRepository.respond(requestId, { status: "rejected" });
    if (!updated) {
      throw new AppError("Request is no longer pending", 409, "CONFLICT");
    }
    otcSocketService.emitRequestResponded(row.requesterUserId, {
      requestId,
      accepted: false,
      peerUserId: targetUserId,
    });
    return { roomId: null };
  }

  const roomId = await provisionOpenToConnectRoom(
    row.requesterUserId,
    targetUserId,
    requestId,
  );
  const updated = await connectRequestsRepository.respond(requestId, {
    status: "accepted",
    roomId,
  });
  if (!updated) {
    throw new AppError("Request is no longer pending", 409, "CONFLICT");
  }

  otcSocketService.emitRequestResponded(row.requesterUserId, {
    requestId,
    accepted: true,
    roomId,
    peerUserId: targetUserId,
  });
  otcSocketService.emitRequestResponded(targetUserId, {
    requestId,
    accepted: true,
    roomId,
    peerUserId: row.requesterUserId,
  });

  return { roomId };
}
