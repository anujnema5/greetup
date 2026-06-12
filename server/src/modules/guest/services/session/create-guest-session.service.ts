import logger from "@/core/logging";
import {
  GuestRateLimitedError,
  GuestTrialAlreadyUsedError,
} from "@/shared/errors";

import { GUEST_SESSION_TTL_MS } from "../../constants/guest-trial.constants";
import { hashGuestTrialIp, hashGuestTrialValue } from "../../lib/guest-trial-hash";
import { guestSessionRepository } from "../../repositories/guest-session.repository";
import {
  assertDeviceMayStartGuestCallTrial,
  assertIpMayCreateGuestSession,
  incrementIpGuestSessionCreateCount,
} from "../abuse/guest-trial-abuse.service";
import { logGuestTrialEvent } from "../audit/log-guest-trial-event.service";
import { createGuestUser } from "./create-guest-user.service";
import type {
  CreateGuestSessionAuthAdapter,
  CreateGuestSessionInput,
  CreateGuestSessionResult,
} from "../../types/create-guest-session.types";

/**
 * Starts a guest call-trial session: abuse checks → guest user → short-lived auth session.
 * HTTP cookie is set by the auth plugin caller.
 */
export async function createGuestSession(
  input: CreateGuestSessionInput,
  adapter: CreateGuestSessionAuthAdapter,
): Promise<CreateGuestSessionResult> {
  const deviceHash = input.deviceFingerprint?.trim()
    ? hashGuestTrialValue(input.deviceFingerprint)
    : null;
  const ipHash = input.ipAddress?.trim() ? hashGuestTrialIp(input.ipAddress) : null;

  if (deviceHash) {
    await assertDeviceMayStartGuestCallTrial(deviceHash);
  }
  if (ipHash) {
    await assertIpMayCreateGuestSession(ipHash);
  }

  let user;
  try {
    user = await createGuestUser(adapter, { deviceHash, ipHash });
  } catch (error) {
    if (error instanceof GuestTrialAlreadyUsedError || error instanceof GuestRateLimitedError) {
      throw error;
    }
    logger.error("create_guest_user_failed", { error });
    throw error;
  }

  if (ipHash) {
    await incrementIpGuestSessionCreateCount(ipHash);
  }

  const authSession = await adapter.createSession(user.id);
  if (!authSession) {
    throw new Error("FAILED_TO_CREATE_GUEST_SESSION");
  }

  const expiresAt = new Date(Date.now() + GUEST_SESSION_TTL_MS);
  await guestSessionRepository.setExpiresAt(authSession.id, expiresAt);
  const session = { ...authSession, expiresAt };

  await logGuestTrialEvent({
    guestUserId: user.id,
    eventType: "guest_session_created",
    deviceHash,
    ipHash,
    metadata: {},
  });

  logger.info("guest_session_created", { userId: user.id });

  return {
    userId: user.id,
    isGuest: true,
    callTrialConsumed: false,
    user,
    session,
  };
}
