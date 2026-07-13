import type { User } from "@better-auth/core/db";

import logger from "@/core/logging";
import { openToConnectStatusRepository } from "@/modules/open-to-connect/repositories/open-to-connect-status.repository";
import { refreshProfileSnapshotFromDatabase } from "@/modules/user/services/profile-snapshot-cache.service";

import { guestProfileRepository } from "../../repositories/guest-profile.repository";
import type { GuestSignupMergeContext, GuestSignupRegisterProvider } from "../../types/guest-signup.types";
import { logGuestTrialEvent } from "../audit/log-guest-trial-event.service";

export type UpgradeGuestUserOnSignupInput = {
  mergeContext: GuestSignupMergeContext;
  incoming: {
    email?: string;
    name?: string;
    image?: string | null;
    emailVerified?: boolean;
    phoneNumber?: string;
    phoneNumberVerified?: boolean;
    username?: string;
    displayName?: string;
  };
  provider: GuestSignupRegisterProvider;
  updateUser: (
    userId: string,
    data: Record<string, unknown>,
  ) => Promise<User | null>;
};

function isGuestPlaceholderEmail(email: string | undefined): boolean {
  return email?.toLowerCase().endsWith("@guest.greetup.invalid") ?? false;
}

/**
 * Upgrades an unconverted guest row in place: credentials on `users`, `is_guest → false`,
 * preserves `guest_trial_consumed_at`, logs `guest_converted`, refreshes profile snapshot.
 */
export async function upgradeGuestUserOnSignup(
  input: UpgradeGuestUserOnSignupInput,
): Promise<User> {
  const { mergeContext, incoming, provider, updateUser } = input;
  const guestUserId = mergeContext.guestUserId;

  const profile = await guestProfileRepository.findByUserId(guestUserId);
  if (!profile?.isGuest || profile.guestConvertedAt != null) {
    throw new Error("GUEST_SIGNUP_MERGE_NOT_ELIGIBLE");
  }

  const incomingEmail = incoming.email?.trim().toLowerCase();
  if (incomingEmail && !isGuestPlaceholderEmail(incomingEmail)) {
    const conflictId = await guestProfileRepository.findRegisteredUserIdByEmail(
      incomingEmail,
      guestUserId,
    );
    if (conflictId) {
      throw new Error("GUEST_SIGNUP_EMAIL_CONFLICT");
    }
  }

  const incomingPhone = incoming.phoneNumber?.trim();
  if (incomingPhone) {
    const conflictId = await guestProfileRepository.findRegisteredUserIdByPhone(
      incomingPhone,
      guestUserId,
    );
    if (conflictId) {
      throw new Error("GUEST_SIGNUP_PHONE_CONFLICT");
    }
  }

  const resolvedName =
    incoming.name?.trim() ||
    incoming.displayName?.trim() ||
    profile.displayName ||
    profile.name;
  const resolvedDisplayName =
    incoming.displayName?.trim() || incoming.name?.trim() || profile.displayName || resolvedName;

  const patch: Record<string, unknown> = {
    name: resolvedName,
    displayName: resolvedDisplayName,
    updatedAt: new Date(),
  };

  if (incomingEmail && !isGuestPlaceholderEmail(incomingEmail)) {
    patch.email = incomingEmail;
  }
  if (incoming.image !== undefined) {
    patch.image = incoming.image;
  }
  if (incoming.emailVerified !== undefined) {
    patch.emailVerified = incoming.emailVerified;
  }
  if (incomingPhone) {
    patch.phoneNumber = incomingPhone;
  }
  if (incoming.phoneNumberVerified !== undefined) {
    patch.phoneNumberVerified = incoming.phoneNumberVerified;
  }
  if (incoming.username?.trim()) {
    patch.username = incoming.username.trim();
  }

  const updated = await updateUser(guestUserId, patch);
  if (!updated) {
    throw new Error("GUEST_SIGNUP_MERGE_UPDATE_FAILED");
  }

  const convertedAt = new Date();
  await guestProfileRepository.markGuestConverted(guestUserId, convertedAt);

  const statusRow = await openToConnectStatusRepository.findByUserId(guestUserId);
  if (statusRow) {
    await openToConnectStatusRepository.setOpenState(statusRow.profileId, {
      openToConnect: true,
      source: null,
      headline: null,
    });
  }

  await logGuestTrialEvent({
    guestUserId,
    eventType: "guest_converted",
    deviceHash: mergeContext.deviceHash,
    ipHash: mergeContext.ipHash,
    metadata: {
      provider,
      trialConsumed: mergeContext.trialConsumed,
    },
  });

  await refreshProfileSnapshotFromDatabase(guestUserId);

  logger.info("guest_converted", {
    guestUserId,
    provider,
    trialConsumed: mergeContext.trialConsumed,
  });

  return updated;
}

export { isGuestPlaceholderEmail };
