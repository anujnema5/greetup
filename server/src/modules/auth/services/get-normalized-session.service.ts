import { sessionUserRepository } from "../repositories/session-user.repository";

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
  dbUser: { name: string | null; displayName: string | null } | null,
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
  return {
    ...session,
    user: {
      ...session.user,
      name: displayName,
      displayName: displayName || null,
    },
  };
}
