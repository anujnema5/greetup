import logger from "@/core/logging";

import { redisMarkDeviceCallTrialConsumed } from "../../lib/guest-trial-redis";
import { guestProfileRepository } from "../../repositories/guest-profile.repository";
import type {
  ConsumeGuestCallTrialInput,
  ConsumeGuestCallTrialResult,
} from "../../types/guest-trial.types";
import { logGuestTrialEvent } from "../audit/log-guest-trial-event.service";
import { emitGuestTrialConsumed } from "../../socket/emit-guest-trial-consumed";

/**
 * Consumes the one-time guest call trial when RTC access is granted.
 * Idempotent — safe when rejoining the same room after a brief disconnect.
 */
export async function consumeGuestCallTrial(
  userId: string,
  input: ConsumeGuestCallTrialInput,
): Promise<ConsumeGuestCallTrialResult> {
  const profile = await guestProfileRepository.findByUserId(userId);
  if (!profile?.isGuest) {
    return {
      applicable: false,
      newlyConsumed: false,
      callTrialConsumed: false,
    };
  }

  const alreadyConsumed = profile.guestTrialConsumedAt != null;
  if (alreadyConsumed) {
    const deviceHash = input.deviceHash?.trim() || profile.guestDeviceHash?.trim();
    if (deviceHash) {
      await redisMarkDeviceCallTrialConsumed(deviceHash);
    }
    return {
      applicable: true,
      newlyConsumed: false,
      callTrialConsumed: true,
    };
  }

  const consumedAt = new Date();
  const newlyConsumed = await guestProfileRepository.markCallTrialConsumedIfUnset(
    userId,
    consumedAt,
  );

  const deviceHash = input.deviceHash?.trim() || profile.guestDeviceHash?.trim();
  const ipHash = input.ipHash?.trim() || profile.guestCreatedIpHash?.trim();

  if (deviceHash || ipHash) {
    await guestProfileRepository.setTrackingHashes(userId, { deviceHash, ipHash });
  }

  if (deviceHash) {
    await redisMarkDeviceCallTrialConsumed(deviceHash);
  }

  if (newlyConsumed) {
    await logGuestTrialEvent({
      guestUserId: userId,
      eventType: "guest_call_trial_consumed",
      deviceHash: deviceHash ?? null,
      ipHash: ipHash ?? null,
      metadata: { roomId: input.roomId },
    });

    logger.info("guest_call_trial_consumed", {
      userId,
      roomId: input.roomId,
    });

    emitGuestTrialConsumed(userId, {
      roomId: input.roomId,
      trialConsumed: true,
      nextStep: "signup",
    });
  }

  return {
    applicable: true,
    newlyConsumed,
    callTrialConsumed: true,
  };
}
