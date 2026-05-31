export type PageHeaderSessionUser = {
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  phoneNumber?: string | null;
};

export type PageHeaderAccountState = {
  displayName: string;
  accountSubtitle: string;
  avatarSrc: string;
  isSigningOut: boolean;
  onGoToProfile: () => void;
  onGoToSettings: () => void;
  onLogout: () => void | Promise<void>;
};
