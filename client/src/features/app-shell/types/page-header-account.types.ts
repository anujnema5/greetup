export type PageHeaderSessionUser = {
  id?: string;
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  phoneNumber?: string | null;
};

export type PageHeaderAccountState = {
  displayName: string;
  accountSubtitle: string;
  avatarImage: string | null;
  avatarSeed: string;
  isSigningOut: boolean;
  onGoToProfile: () => void;
  onGoToSettings: () => void;
  onLogout: () => void | Promise<void>;
};
