import logger from "@/core/logging";
import {
  sessionUserRepository,
  type SessionUserContextRow,
} from "../repositories/session-user.repository";

type SessionUserLike = {
  id?: string;
  name?: string | null;
  displayName?: string | null;
  phoneNumber?: string | null;
  [key: string]: unknown;
};

export type AuthSessionLike = {
  user?: SessionUserLike;
  [key: string]: unknown;
};

function resolveDisplayName(
  sessionUser: SessionUserLike,
  dbUser: Pick<SessionUserContextRow, "name" | "displayName"> | null,
): string {
  return (
    dbUser?.displayName?.trim() ||
    dbUser?.name?.trim() ||
    sessionUser.displayName?.trim() ||
    sessionUser.name?.trim() ||
    ""
  );
}

export async function getNormalizedSessionService(
  session: AuthSessionLike | null,
): Promise<AuthSessionLike | null> {
  if (!session?.user) return session;

  const userId = session.user.id;
  const dbUser = userId
    ? await sessionUserRepository.findSessionContextByUserId(userId)
    : null;

  const displayName = resolveDisplayName(session.user, dbUser);
  const isOnboarded = dbUser?.isOnboarded ?? false;
  const isGuest = dbUser?.isGuest ?? false;
  const guestTrialConsumed = dbUser?.guestTrialConsumed ?? false;

  logger.debug("session_normalized", {
    userId,
    hasDbUser: !!dbUser,
    isOnboarded,
    isGuest,
  });

  return {
    ...session,
    user: {
      ...session.user,
      name: displayName,
      displayName: displayName || null,
      phoneNumber:
        dbUser?.phoneNumber ??
        (session.user as { phoneNumber?: string | null }).phoneNumber ??
        null,
      isOnboarded,
      isGuest,
      guestTrialConsumed,
    },
  };
}
