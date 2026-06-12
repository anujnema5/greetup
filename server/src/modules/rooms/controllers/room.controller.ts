import type { Context } from "hono";
import { randomUUID } from "crypto";
import { ApiResponse, internalError } from "@/shared/responses";
import { emitToUser } from "@/core/socket/socket";
import logger from "@/core/logging";
import { getRedis } from "@/core/redis";
import { ROOM_KEYS, ROOM_TTL } from "@/core/redis/keys";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";
import { ensureProfileSnapshotCached } from "@/modules/user/services/profile-snapshot-cache.service";
import {
  createRoomBodySchema,
  ensureProfileSnapshotBodySchema,
  roomInviteBodySchema,
  roomInviteRespondBodySchema,
  updateLiveRoomTitleBodySchema,
  reportCircleNsfwViolationBodySchema,
  matchCompletedBodySchema,
  matchFailedBodySchema,
  matchProposalCancelledBodySchema,
  matchProposedBodySchema,
} from "../schemas/room.schema";
import { zodBodyValidationError } from "../lib/http-responses";
import { roomAccessRepository } from "../repositories/room-access.repository";
import { roomCategoriesRepository } from "../repositories/room-categories.repository";
import { roomCreationRepository } from "../repositories/room-creation.repository";
import { roomsRepository } from "../repositories/rooms.repository";
import { roomParticipantsRepository } from "../repositories/room-participants.repository";
import {
  createRoomInviteService,
  respondRoomInviteService,
  RoomInviteError,
} from "../services/direct/expand-direct-room.service";
import {
  updateLiveRoomTitleService,
  UpdateLiveRoomTitleError,
} from "../services/circle/update-live-room-title.service";
import { mergeRoomAdvancedOptions } from "@/core/database/schema";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/expiry/room-expiry";
import { roomSessionTimingPayload } from "@/modules/rooms/lib/expiry/room-session-timing-payload";
import {
  reconcileRoomSessionOnAccess,
  roomSessionClosedMessage,
} from "@/modules/rooms/services/session/reconcile-room-session-on-access.service";
import { issueRtcTokenService, IssueRtcTokenError } from "../services/access/issue-rtc-token.service";
import { joinRoomService, JoinRoomError } from "../services/access/join-room.service";
import {
  openCircleMeetingService,
  OpenCircleMeetingError,
} from "../services/access/open-circle-meeting.service";
import {
  hostEndCircleForEveryoneService,
  HostEndCircleForEveryoneError,
} from "../services/participation/host-end-circle-for-everyone.service";
import {
  kickCircleParticipantService,
  KickCircleParticipantError,
} from "../services/participation/kick-circle-participant.service";
import {
  reportCircleNsfwViolationService,
  ReportCircleNsfwViolationError,
} from "../services/moderation/report-circle-nsfw-violation.service";
import {
  leaveCircleRtcSessionForUser,
  LeaveCircleRtcError,
} from "../services/participation/leave-circle-rtc-session.service";
import {
  startRoomSessionService,
  StartRoomSessionError,
} from "../services/session/start-room-session.service";
import { syncCircleRoomExpiryFromClockIfDue } from "../services/session/circle-room-expiry-sync.service";
import { syncGuestMatchRoomSessionCap } from "../services/session/sync-guest-match-room-session-cap.service";
import { deleteSessionRoomRedis } from "../services/rtc/session-room-redis.service";
import { resolveConnectionCallConversationId } from "@/modules/rooms/lib/session/resolve-connection-call-conversation-id";
import { isSessionKind } from "@/shared/types/session-kind";
import { AppError } from "@/shared/errors";

/**
 * GET /api/room/:roomId/rtc-token
 * Short-lived JWT for rtc-service Socket.IO (direct or circle rooms; must be live + participant).
 */
export const handleIssueRtcToken = async (c: Context) => {
  const roomId = c.req.param("roomId");
  const userId = c.get("userId") as string;

  if (!roomId) {
    return c.json(
      ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
      400,
    );
  }

  try {
    const data = await issueRtcTokenService(userId, roomId);
    return c.json(ApiResponse.success(data, "RTC token issued", 200), 200);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof IssueRtcTokenError) {
      const status = error.statusCode as 400 | 403 | 404 | 410;
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: status,
          code: error.code,
        }),
        status,
      );
    }
    logger.error("Issue RTC token error", { error });
    return internalError(c, error);
  }
};

/**
 * POST /internal/rooms/match
 * Called by the match engine to provision a room for a matched pair.
 * Persists a `rooms` row + participants (category `match`), then Redis (same id).
 */
export const handleCreateRoom = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = createRoomBodySchema.safeParse(body);

    if (!parsed.success) {
      return zodBodyValidationError(c, parsed.error);
    }

    const { attemptId, pairId, users } = parsed.data;

    const category = await roomCategoriesRepository.findActiveCategoryBySlug("match");
    if (!category) {
      logger.error("room_categories missing slug=match — run db:seed");
      return c.json(
        ApiResponse.error({
          message: "Match category not configured",
          statusCode: 503,
          code: "MATCH_CATEGORY_NOT_CONFIGURED",
        }),
        503,
      );
    }

    const roomId = randomUUID();
    await roomCreationRepository.createMatchPairRoom({
      roomId,
      hostUserId: users[0],
      peerUserId: users[1],
      categoryId: category.id,
    });
    await syncGuestMatchRoomSessionCap(roomId);

    const redis = getRedis();
    const key = `${ROOM_KEYS.ROOM}${roomId}`;
    await redis.hset(key, {
      sessionKind: "match",
      roomId,
      attemptId,
      pairId,
      userA: users[0],
      userB: users[1],
      createdAt: Date.now(),
    });
    await redis.expire(key, ROOM_TTL);

    logger.info("Room created (DB + Redis)", { roomId, attemptId, pairId, users });

    return c.json(ApiResponse.success({ roomId }, "Room created", 201), 201);
  } catch (error) {
    logger.error("Failed to create room", { error });
    return internalError(c, error);
  }
};

/**
 * POST /api/room/:roomId/open-meeting
 * Host clears the lobby gate so non-hosts can obtain RTC tokens (`shouldHostStartMeeting`).
 */
export const handleOpenCircleMeeting = async (c: Context) => {
  const roomId = c.req.param("roomId");
  const userId = c.get("userId") as string;

  if (!roomId) {
    return c.json(
      ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
      400,
    );
  }

  try {
    await openCircleMeetingService(userId, roomId);
    return c.json(ApiResponse.success({ roomId }, "Circle opened", 200), 200);
  } catch (error: unknown) {
    if (error instanceof OpenCircleMeetingError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 403 | 404 | 503,
      );
    }
    logger.error("Open circle error", { error });
    return internalError(c, error);
  }
};

/**
 * POST /api/room/:roomId/leave-circle-rtc
 * Records the caller as departed. When nobody remains: if `deleteCircleAfterCall`, ends immediately;
 * else sets `expires_at` to the sooner of empty-room grace, `scheduled_end_at`, or an existing deadline.
 */
export const handleLeaveCircleRtc = async (c: Context) => {
  const roomId = c.req.param("roomId");
  const userId = c.get("userId") as string;

  if (!roomId) {
    return c.json(
      ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
      400,
    );
  }

  try {
    const result = await leaveCircleRtcSessionForUser(userId, roomId, { httpStrict: true });
    return c.json(ApiResponse.success(result, "Recorded", 200), 200);
  } catch (error: unknown) {
    if (error instanceof LeaveCircleRtcError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 403 | 404,
      );
    }
    logger.error("Leave circle RTC error", { error });
    return internalError(c, error);
  }
};

/**
 * POST /api/room/:roomId/host-end-circle
 * Host-only: ends the live RTC session for everyone (participants marked left, Redis cleared).
 * Calendar circles with a scheduled start return to `scheduled`; instant circles are ended in Postgres.
 */
export const handleHostEndCircleForEveryone = async (c: Context) => {
  const roomId = c.req.param("roomId");
  const userId = c.get("userId") as string;

  if (!roomId) {
    return c.json(
      ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
      400,
    );
  }

  try {
    const result = await hostEndCircleForEveryoneService(userId, roomId);
    return c.json(ApiResponse.success(result, "Circle ended", 200), 200);
  } catch (error: unknown) {
    if (error instanceof HostEndCircleForEveryoneError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 403 | 404,
      );
    }
    logger.error("Host end circle for everyone error", { error });
    return internalError(c, error);
  }
};

/**
 * POST /api/room/:roomId/kick/:userId
 * Host-only: removes one participant from the live circle and disconnects their RTC session.
 */
export const handleKickCircleParticipant = async (c: Context) => {
  const roomId = c.req.param("roomId");
  const targetUserId = c.req.param("userId");
  const hostUserId = c.get("userId") as string;

  if (!roomId || !targetUserId) {
    return c.json(
      ApiResponse.error({
        message: "roomId and userId are required",
        statusCode: 400,
        code: "VALIDATION_ERROR",
      }),
      400,
    );
  }

  let restrict = false;
  try {
    const body = await c.req.json<{ restrict?: boolean }>();
    restrict = body?.restrict === true;
  } catch {
    restrict = false;
  }

  try {
    const result = await kickCircleParticipantService(hostUserId, roomId, targetUserId, {
      restrict,
    });
    const message = result.restricted
      ? "Participant removed and restricted"
      : "Participant removed";
    return c.json(ApiResponse.success(result, message, 200), 200);
  } catch (error: unknown) {
    if (error instanceof KickCircleParticipantError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 403 | 404,
      );
    }
    logger.error("Kick circle participant error", { error });
    return internalError(c, error);
  }
};

/**
 * POST /api/room/:roomId/nsfw-violation
 * Client-detected NSFW on the caller's own video: kick self from circle, record strike, ban on repeat.
 */
export const handleReportCircleNsfwViolation = async (c: Context) => {
  const roomId = c.req.param("roomId");
  const userId = c.get("userId") as string;

  if (!roomId) {
    return c.json(
      ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
      400,
    );
  }

  let body = {};
  try {
    const raw = await c.req.json();
    const parsed = reportCircleNsfwViolationBodySchema.safeParse(raw);
    if (!parsed.success) {
      return zodBodyValidationError(c, parsed.error);
    }
    body = parsed.data;
  } catch {
    body = {};
  }

  try {
    const result = await reportCircleNsfwViolationService(userId, roomId, body);
    return c.json(
      ApiResponse.success(result, "NSFW policy violation recorded", 200),
      200,
    );
  } catch (error: unknown) {
    if (error instanceof ReportCircleNsfwViolationError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 403 | 404 | 429,
      );
    }
    logger.error("Report circle NSFW violation error", { error });
    return internalError(c, error);
  }
};

/**
 * POST /api/room/:roomId/start
 * Host starts a scheduled DB room: persists live in Postgres, then provisions Redis session state.
 */
export const handleStartRoomSession = async (c: Context) => {
  const roomId = c.req.param("roomId");
  const userId = c.get("userId") as string;

  if (!roomId) {
    return c.json(
      ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
      400,
    );
  }

  try {
    const result = await startRoomSessionService(userId, roomId);
    return c.json(ApiResponse.success(result, "Room session started", 200), 200);
  } catch (error: unknown) {
    if (error instanceof StartRoomSessionError) {
      const status =
        error.code === "ROOM_NOT_FOUND" ? 404 : error.code === "NOT_HOST" ? 403 : 400;
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: status,
          code: error.code,
        }),
        status,
      );
    }
    logger.error("Failed to start room session", { error });
    return internalError(c, error);
  }
};

/**
 * POST /api/room/:roomId/join
 * Ensures the user is in `room_participants` so they can obtain an RTC token (direct match + circles).
 */
export const handleJoinRoom = async (c: Context) => {
  const roomId = c.req.param("roomId");
  const userId = c.get("userId") as string;

  if (!roomId) {
    return c.json(
      ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
      400,
    );
  }

  try {
    await joinRoomService(userId, roomId);
    return c.json(ApiResponse.success({ roomId }, "Joined room", 200), 200);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof JoinRoomError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 403 | 404 | 410,
      );
    }
    logger.error("Join room error", { error });
    return internalError(c, error);
  }
};

/**
 * PATCH /api/room/:roomId/title
 * Host renames a live circle room; syncs Redis session hash when present.
 */
export const handlePatchRoomTitle = async (c: Context) => {
  const roomId = c.req.param("roomId");
  const userId = c.get("userId") as string;

  if (!roomId) {
    return c.json(
      ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
      400,
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  const parsed = updateLiveRoomTitleBodySchema.safeParse(body);
  if (!parsed.success) {
    return zodBodyValidationError(c, parsed.error);
  }

  try {
    const data = await updateLiveRoomTitleService(userId, roomId, parsed.data.title);
    return c.json(ApiResponse.success(data, "Title updated", 200), 200);
  } catch (error: unknown) {
    if (error instanceof UpdateLiveRoomTitleError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 403 | 404,
      );
    }
    logger.error("Update room title error", { error });
    return internalError(c, error);
  }
};

/**
 * POST /api/room/:roomId/invite
 * Participant invites a connection to upgrade this direct call to a circle (pending until they accept).
 */
export const handleRoomInvite = async (c: Context) => {
  const roomId = c.req.param("roomId");
  const userId = c.get("userId") as string;

  if (!roomId) {
    return c.json(
      ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
      400,
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  const parsed = roomInviteBodySchema.safeParse(body);
  if (!parsed.success) {
    return zodBodyValidationError(c, parsed.error);
  }

  try {
    const data = await createRoomInviteService(userId, roomId, parsed.data.inviteeUserId);
    return c.json(ApiResponse.success(data, "Invite sent", 200), 200);
  } catch (error: unknown) {
    if (error instanceof RoomInviteError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 403 | 404,
      );
    }
    logger.error("Room invite error", { error });
    return internalError(c, error);
  }
};

/**
 * POST /api/room/:roomId/invite/respond
 * Invitee accepts or declines — on accept the room becomes a circle in place.
 */
export const handleRoomInviteRespond = async (c: Context) => {
  const roomId = c.req.param("roomId");
  const userId = c.get("userId") as string;

  if (!roomId) {
    return c.json(
      ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
      400,
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  const parsed = roomInviteRespondBodySchema.safeParse(body);
  if (!parsed.success) {
    return zodBodyValidationError(c, parsed.error);
  }

  try {
    const data = await respondRoomInviteService(userId, parsed.data.inviteId, parsed.data.accept);
    if (data.roomId !== roomId) {
      return c.json(
        ApiResponse.error({
          message: "Invite does not match this room",
          statusCode: 400,
          code: "ROOM_MISMATCH",
        }),
        400,
      );
    }
    return c.json(ApiResponse.success(data, data.expanded ? "Call expanded" : "Invite declined", 200), 200);
  } catch (error: unknown) {
    if (error instanceof RoomInviteError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 403 | 404 | 409,
      );
    }
    logger.error("Room invite respond error", { error });
    return internalError(c, error);
  }
};

type DbRoomRow = NonNullable<Awaited<ReturnType<typeof roomsRepository.findRoomById>>>;

function formatRoomScheduledStartAt(dbRoom: DbRoomRow): string | null {
  if (dbRoom.scheduledStartAt instanceof Date) {
    return dbRoom.scheduledStartAt.toISOString();
  }
  if (dbRoom.scheduledStartAt) {
    return new Date(dbRoom.scheduledStartAt).toISOString();
  }
  return null;
}

function circleLobbyGateFromAdvancedOptions(dbRoom: DbRoomRow): "0" | "1" {
  const adv = mergeRoomAdvancedOptions(dbRoom.advancedOptions);
  return adv.shouldHostStartMeeting !== false ? "1" : "0";
}

function circleLobbyGateFromRedis(room: Record<string, string>): "0" | "1" {
  return typeof room.lobbyGateActive === "string" &&
    (room.lobbyGateActive === "0" || room.lobbyGateActive === "1")
    ? room.lobbyGateActive
    : "0";
}

function buildCircleRoomPayload(
  dbRoom: DbRoomRow,
  lobbyGateActive: "0" | "1",
  roomIdOverride?: string,
) {
  return {
    sessionKind: "circle" as const,
    roomId: roomIdOverride ?? dbRoom.id,
    hostUserId: dbRoom.hostUserId,
    roomType: dbRoom.roomType,
    title: dbRoom.title,
    status: dbRoom.status,
    lobbyGateActive,
    scheduledStartAt: formatRoomScheduledStartAt(dbRoom),
    ...roomSessionTimingPayload(dbRoom),
  };
}

/**
 * GET /api/room/:roomId
 * Returns Redis-backed room payload (match pair or DB session room).
 */
export const handleGetRoom = async (c: Context) => {
  const userId = c.get("userId");
  const roomId = c.req.param("roomId");
  if (!roomId) {
    return c.json(
      ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
      400
    );
  }

  try {
    const redis = getRedis();
    const room = await redis.hgetall(`${ROOM_KEYS.ROOM}${roomId}`);
    if (!room || !room.roomId) {
      let dbRoom = await roomsRepository.findRoomById(roomId);
      if (!dbRoom) {
        return c.json(
          ApiResponse.error({ message: "Room not found", statusCode: 404, code: "NOT_FOUND" }),
          404,
        );
      }

      if (dbRoom.roomType === "direct" && dbRoom.status === "live") {
        const reconciled = await reconcileRoomSessionOnAccess(roomId);
        if (reconciled.closed) {
          return c.json(
            ApiResponse.error({
              message: roomSessionClosedMessage(reconciled.reason),
              statusCode: 410,
              code: "ROOM_EXPIRED",
            }),
            410,
          );
        }
        dbRoom = (await roomsRepository.findRoomById(roomId)) ?? dbRoom;

        if (dbRoom.sessionKind === "connection_call") {
          const conversationId = await resolveConnectionCallConversationId(roomId);
          return c.json(
            ApiResponse.success(
              {
                sessionKind: "connection_call" as const,
                roomId: dbRoom.id,
                hostUserId: dbRoom.hostUserId,
                roomType: "direct" as const,
                title: dbRoom.title,
                lobbyGateActive: "0" as const,
                ...(conversationId ? { conversationId } : {}),
                ...roomSessionTimingPayload(dbRoom),
              },
              "Room found",
            ),
          );
        }

        const participantIds = await roomParticipantsRepository.listActiveParticipantUserIds(roomId);
        const hostId = dbRoom.hostUserId;
        const peerId = participantIds.find((id) => id !== hostId) ?? participantIds[1];
        if (hostId && peerId && participantIds.length >= 2) {
          return c.json(
            ApiResponse.success(
              {
                sessionKind: "match" as const,
                roomId,
                userA: hostId,
                userB: peerId,
                matchScore: null,
                ...roomSessionTimingPayload(dbRoom),
              },
              "Room found",
            ),
          );
        }
      }

      if (dbRoom.roomType !== "circle" && dbRoom.sessionKind !== "circle") {
        return c.json(
          ApiResponse.error({ message: "Room not found", statusCode: 404, code: "NOT_FOUND" }),
          404,
        );
      }
      const reconciled = await reconcileRoomSessionOnAccess(roomId);
      if (reconciled.closed) {
        return c.json(
          ApiResponse.error({
            message: roomSessionClosedMessage(reconciled.reason),
            statusCode: 410,
            code: "ROOM_EXPIRED",
          }),
          410,
        );
      }
      dbRoom = (await roomsRepository.findRoomById(roomId)) ?? dbRoom;
      const allowed = await roomAccessRepository.canUserViewCircleRoomMetadata(userId, dbRoom);
      if (!allowed) {
        return c.json(
          ApiResponse.error({
            message: "You are not allowed to view this room",
            statusCode: 403,
            code: "NOT_ALLOWED",
          }),
          403,
        );
      }
      return c.json(
        ApiResponse.success(
          buildCircleRoomPayload(dbRoom, circleLobbyGateFromAdvancedOptions(dbRoom)),
          "Room found",
        ),
      );
    }

    if (room.sessionKind === "connection_call") {
      let dbRoom = await roomsRepository.findRoomById(roomId);
      if (dbRoom) {
        const reconciled = await reconcileRoomSessionOnAccess(roomId);
        if (reconciled.closed) {
          await deleteSessionRoomRedis(roomId);
          return c.json(
            ApiResponse.error({
              message: roomSessionClosedMessage(reconciled.reason),
              statusCode: 410,
              code: "ROOM_EXPIRED",
            }),
            410,
          );
        }
        dbRoom = (await roomsRepository.findRoomById(roomId)) ?? dbRoom;
      }
      const conversationId =
        room.conversationId?.trim() ||
        (await resolveConnectionCallConversationId(roomId, room)) ||
        undefined;
      return c.json(
        ApiResponse.success(
          {
            sessionKind: "connection_call" as const,
            roomId: room.roomId,
            hostUserId: room.hostUserId,
            roomType: "direct" as const,
            title: room.title ?? "Call",
            lobbyGateActive: "0" as const,
            ...(conversationId ? { conversationId } : {}),
            ...(dbRoom ? roomSessionTimingPayload(dbRoom) : {}),
          },
          "Room found",
        ),
      );
    }

    if (room.sessionKind === "circle") {
      let dbRoom = await roomsRepository.findRoomById(roomId);
      if (dbRoom?.roomType === "circle" || dbRoom?.roomType === "direct") {
        const reconciled = await reconcileRoomSessionOnAccess(roomId);
        if (reconciled.closed) {
          await deleteSessionRoomRedis(roomId);
          return c.json(
            ApiResponse.error({
              message: roomSessionClosedMessage(reconciled.reason),
              statusCode: 410,
              code: "ROOM_EXPIRED",
            }),
            410,
          );
        }
        dbRoom = (await roomsRepository.findRoomById(roomId)) ?? dbRoom;
      }
      if (dbRoom && isDbRoomSessionClosed(dbRoom)) {
        await deleteSessionRoomRedis(roomId);
        return c.json(
          ApiResponse.error({
            message: "This room session is no longer available",
            statusCode: 410,
            code: "ROOM_EXPIRED",
          }),
          410,
        );
      }
      if (!dbRoom) {
        return c.json(
          ApiResponse.error({ message: "Room not found", statusCode: 404, code: "NOT_FOUND" }),
          404,
        );
      }
      return c.json(
        ApiResponse.success(
          buildCircleRoomPayload(dbRoom, circleLobbyGateFromRedis(room), room.roomId),
          "Room found",
        ),
      );
    }

    const dbRoomForRedisKind = await roomsRepository.findRoomById(roomId);
    if (
      dbRoomForRedisKind?.sessionKind === "circle" &&
      !isSessionKind(room.sessionKind)
    ) {
      const reconciled = await reconcileRoomSessionOnAccess(roomId);
      if (reconciled.closed) {
        await deleteSessionRoomRedis(roomId);
        return c.json(
          ApiResponse.error({
            message: roomSessionClosedMessage(reconciled.reason),
            statusCode: 410,
            code: "ROOM_EXPIRED",
          }),
          410,
        );
      }
      const dbRoom = (await roomsRepository.findRoomById(roomId)) ?? dbRoomForRedisKind;
      if (isDbRoomSessionClosed(dbRoom)) {
        await deleteSessionRoomRedis(roomId);
        return c.json(
          ApiResponse.error({
            message: "This room session is no longer available",
            statusCode: 410,
            code: "ROOM_EXPIRED",
          }),
          410,
        );
      }
      return c.json(
        ApiResponse.success(
          buildCircleRoomPayload(dbRoom, circleLobbyGateFromRedis(room), room.roomId),
          "Room found",
        ),
      );
    }

    const dbRoom = await roomsRepository.findRoomById(roomId);
    const matchPayload: Record<string, unknown> = {
      sessionKind: "match",
      roomId: room.roomId,
      userA: room.userA,
      userB: room.userB,
      matchScore: room.matchScore ?? null,
    };
    if (dbRoom?.roomType === "circle") {
      matchPayload.roomType = "circle";
      matchPayload.title = dbRoom.title;
      if (dbRoom.hostUserId) {
        matchPayload.hostUserId = dbRoom.hostUserId;
      }
    }
    if (dbRoom) {
      Object.assign(matchPayload, roomSessionTimingPayload(dbRoom));
    }

    return c.json(ApiResponse.success(matchPayload, "Room found"));
  } catch (error) {
    logger.error("Failed to get room", { error });
    return internalError(c, error);
  }
};

/**
 * POST /internal/webhook/ensure-profile-snapshot
 * Called by the matching service when Redis has no `user:profile:snapshot:{userId}`.
 * Loads the profile from the database and writes the snapshot key (NX).
 */
export const handleEnsureProfileSnapshot = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = ensureProfileSnapshotBodySchema.safeParse(body);

    if (!parsed.success) {
      return zodBodyValidationError(c, parsed.error);
    }

    const cached = await ensureProfileSnapshotCached(parsed.data.userId);
    if (!cached) {
      return c.json(
        ApiResponse.error({ message: "Profile not found", statusCode: 404, code: "PROFILE_NOT_FOUND" }),
        404
      );
    }

    return c.json(ApiResponse.success({ cached: true }, "Profile snapshot cached"), 200);
  } catch (error) {
    logger.error("Failed to ensure profile snapshot", { error });
    return internalError(c, error);
  }
};

/**
 * POST /internal/webhook/match-failed
 * Called by the match engine when no compatible candidate is found.
 * Emits a socket event to the user so their client can react.
 */
/**
 * POST /internal/webhook/match-proposed
 * Pair is locked; room is created only after both tap Connect on the client.
 */
export const handleMatchProposed = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = matchProposedBodySchema.safeParse(body);

    if (!parsed.success) {
      return zodBodyValidationError(c, parsed.error);
    }

    const { userA, userB, attemptIdA, attemptIdB, matchScore, isFallbackMatch } = parsed.data;

    logger.info("[handleMatchProposed] emitting match:proposed to both users", {
      userA,
      userB,
      attemptIdA,
      attemptIdB,
      matchScore,
    });

    const base = { matchScore, isFallbackMatch };
    emitToUser(userA, "match:proposed", { ...base, attemptId: attemptIdA, peerId: userB });
    emitToUser(userB, "match:proposed", { ...base, attemptId: attemptIdB, peerId: userA });

    return c.json(ApiResponse.success(null, "Notified"), 200);
  } catch (error) {
    logger.error("Failed to handle match proposed webhook", { error });
    return internalError(c, error);
  }
};

/**
 * POST /internal/webhook/match-proposal-cancelled
 * Skip, cancel, or room failure while in the proposal phase.
 */
export const handleMatchProposalCancelled = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = matchProposalCancelledBodySchema.safeParse(body);

    if (!parsed.success) {
      return zodBodyValidationError(c, parsed.error);
    }

    const { userId, attemptId, reason } = parsed.data;

    logger.info("[handleMatchProposalCancelled] emitting to user", { userId, attemptId, reason });

    await clearUserActiveRtcRoom(userId);

    emitToUser(userId, "match:proposal_cancelled", { attemptId, reason });

    return c.json(ApiResponse.success(null, "Notified"), 200);
  } catch (error) {
    logger.error("Failed to handle match proposal cancelled webhook", { error });
    return internalError(c, error);
  }
};

export const handleMatchFailed = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = matchFailedBodySchema.safeParse(body);

    if (!parsed.success) {
      return zodBodyValidationError(c, parsed.error);
    }

    const { attemptId, userId, reason } = parsed.data;

    logger.info("[handleMatchFailed] webhook received — emitting match:no_match to user", { attemptId, userId, reason });

    await clearUserActiveRtcRoom(userId);

    emitToUser(userId, "match:no_match", { attemptId, reason });

    return c.json(ApiResponse.success(null, "Notified"), 200);
  } catch (error) {
    logger.error("Failed to handle match failed webhook", { error });
    return internalError(c, error);
  }
};

/**
 * POST /internal/webhook/match-completed
 * Called by the match engine after a match is finalised.
 * Emits a socket event to both matched users so their clients can react.
 */
export const handleMatchCompleted = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = matchCompletedBodySchema.safeParse(body);

    if (!parsed.success) {
      return zodBodyValidationError(c, parsed.error);
    }

    const { attemptId, userA, userB, roomId, matchScore, isFallbackMatch } = parsed.data;

    logger.info("[handleMatchCompleted] webhook received — emitting match:completed to both users", { attemptId, userA, userB, roomId, matchScore, isFallbackMatch });

    const payload = { attemptId, roomId, matchScore, isFallbackMatch };

    emitToUser(userA, "match:completed", { ...payload, peerId: userB });
    logger.info("[handleMatchCompleted] emitted match:completed to userA", { userA, roomId });

    emitToUser(userB, "match:completed", { ...payload, peerId: userA });
    logger.info("[handleMatchCompleted] emitted match:completed to userB", { userB, roomId });

    return c.json(ApiResponse.success(null, "Notified"), 200);
  } catch (error) {
    logger.error("Failed to handle match completed webhook", { error });
    return internalError(c, error);
  }
};
