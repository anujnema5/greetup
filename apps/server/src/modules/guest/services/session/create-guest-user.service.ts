import { generateRandomString } from "better-auth/crypto";

import { GUEST_EMAIL_DOMAIN } from "../../constants/guest-trial.constants";
import { guestProfileRepository } from "../../repositories/guest-profile.repository";
import type {
  CreateGuestSessionAuthAdapter,
  GuestAuthUser,
} from "../../types/create-guest-session.types";

function buildGuestCredentials() {
  const suffix = generateRandomString(20);
  const username = `guest_${suffix.slice(0, 12)}`;
  const email = `guest+${suffix}@${GUEST_EMAIL_DOMAIN}`;
  return { username, email };
}

/**
 * Creates a Better Auth user row + `user_profiles` with `is_guest = true`.
 * No `account` row — guest converts via signup later.
 */
export async function createGuestUser(
  adapter: Pick<CreateGuestSessionAuthAdapter, "createUser">,
  tracking: { deviceHash?: string | null; ipHash?: string | null },
): Promise<GuestAuthUser> {
  const { username, email } = buildGuestCredentials();

  const created = await adapter.createUser({
    email,
    name: "Guest",
    username,
    emailVerified: false,
  });

  if (!created) {
    throw new Error("FAILED_TO_CREATE_GUEST_USER");
  }

  await guestProfileRepository.createGuestProfile(created.id, tracking);

  return created;
}
