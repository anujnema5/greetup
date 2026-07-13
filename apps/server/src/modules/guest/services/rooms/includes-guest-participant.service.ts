import { guestProfileRepository } from "../../repositories/guest-profile.repository";

export async function includesGuestParticipant(participantUserIds: string[]): Promise<boolean> {
  return guestProfileRepository.anyUserIdIsGuest(participantUserIds);
}
