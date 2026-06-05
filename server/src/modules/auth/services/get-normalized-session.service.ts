import logger from "@/core/logging";
import {
  sessionUserRepository,
  type SessionUserIdentityRow,
} from "../repositories/session-user.repository";

type SessionUserLike = {
  id?: string;
  name?: string | null;
  displayName?: string | null;
  [key: string]: unknown;
};

export type AuthSessionLike = {
  user?: SessionUserLike;
  [key: string]: unknown;
};

function resolveDisplayName(
  sessionUser: SessionUserLike,
  dbUser: Pick<SessionUserIdentityRow, "name" | "displayName"> | null,
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

  const dbUser = session.user.id
    ? await sessionUserRepository.findIdentityByUserId(session.user.id)
    : null;

  const displayName = resolveDisplayName(session.user, dbUser);
  logger.debug("session_normalized", {
    userId: session.user.id,
    hasDbUser: !!dbUser,
  });
  return {
    ...session,
    user: {
      ...session.user,
      name: displayName,
      displayName: displayName || null,
      phoneNumber: dbUser?.phoneNumber ?? (session.user as { phoneNumber?: string | null }).phoneNumber ?? null,
    },
  };
}
