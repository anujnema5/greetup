import type { PublicProfileConnectionPanel } from "../lib/public-profile-connection";
import type { PublicProfileData } from "./public-profile.types";

export type PublicProfilePeer = {
  userId: string;
  username: string;
  displayTitle: string;
  primaryImage: string | null;
};

export type PublicProfileConnectionHandlers = {
  onConnect: () => void;
  onDisconnect: () => Promise<boolean>;
  onWithdraw: () => Promise<boolean>;
  onAccept: () => void;
  onReject: () => void;
  isSubmittingConnect: boolean;
  isSubmittingDisconnect: boolean;
  isSubmittingWithdraw: boolean;
  isSubmittingAccept: boolean;
  isSubmittingReject: boolean;
};

export type PublicProfileActionsProps = {
  panel: PublicProfileConnectionPanel;
  peer: PublicProfilePeer;
  isViewer: boolean;
  connectionHandlers: PublicProfileConnectionHandlers;
  className?: string;
};

export type PublicProfileActionsContext = {
  profile: PublicProfileData;
  panel: PublicProfileConnectionPanel;
  peer: PublicProfilePeer;
};
