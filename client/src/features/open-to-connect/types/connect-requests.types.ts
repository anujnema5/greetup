export type ConnectRequestPeer = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
};

export type ConnectRequestItem = {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  roomId: string | null;
  peer: ConnectRequestPeer;
};

export type ConnectRequestListData = {
  items: ConnectRequestItem[];
};

export type OtcRequestReceivedSocketPayload = {
  requestId: string;
  requesterUserId: string;
  requesterUsername: string;
  requesterDisplayName: string | null;
  requesterImage: string | null;
  message: string | null;
  expiresAt: string;
};

export type OtcRequestRespondedSocketPayload = {
  requestId: string;
  accepted: boolean;
  roomId?: string;
  peerUserId: string;
};
