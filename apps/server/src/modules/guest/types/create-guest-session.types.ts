export type GuestAuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  username?: string | null;
  displayName?: string | null;
  image?: string | null;
};

export type GuestAuthSession = {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type CreateGuestSessionInput = {
  deviceFingerprint?: string;
  ipAddress?: string | null;
};

export type CreateGuestSessionAuthAdapter = {
  createUser: (input: {
    email: string;
    name: string;
    username: string;
    emailVerified: boolean;
  }) => Promise<GuestAuthUser | null>;
  createSession: (userId: string) => Promise<GuestAuthSession | null>;
};

export type CreateGuestSessionResult = {
  userId: string;
  isGuest: true;
  callTrialConsumed: false;
  user: GuestAuthUser;
  session: GuestAuthSession;
};
