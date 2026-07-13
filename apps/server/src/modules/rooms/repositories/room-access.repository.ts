import type { RoomSessionType } from "@/shared/types/room-session";
import { roomInvitesRepository } from "@/modules/rooms/repositories/room-invites.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";

export const roomAccessRepository = {
  /**
   * Whether the user may load circle room metadata (GET room) when Redis has no session yet.
   * Host, public spaces, invitees with pending/accepted friend invite, or active participants.
   */
  async canUserViewSpaceRoomMetadata(
    userId: string,
    room: {
      id: string;
      roomType: RoomSessionType;
      hostUserId: string;
      visibility: "private" | "public";
    },
  ): Promise<boolean> {
    if (room.roomType !== "space") return false;
    if (room.hostUserId === userId) return true;
    if (room.visibility === "public") return true;

    const invite = await roomInvitesRepository.findFriendInvite(room.id, userId);
    if (invite) return true;

    return roomParticipantsRepository.isUserRoomParticipant(room.id, userId);
  },
};
