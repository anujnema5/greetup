export type ConnectionCallMode = 'audio' | 'video';

export type ConnectionCallInitiateResult = {
  requestId: string;
  roomId: string;
  conversationId: string;
  calleeUserId: string;
  mode: ConnectionCallMode;
};

export type ConnectionCallRespondResult = {
  requestId: string;
  roomId: string;
  conversationId: string;
  mode: ConnectionCallMode;
  accepted: boolean;
};

export type IncomingConnectionCall = {
  requestId: string;
  roomId: string;
  conversationId: string;
  callerUserId: string;
  callerDisplayName: string;
  callerImage: string | null;
  mode: ConnectionCallMode;
  createdAt: number;
};

export type OutgoingConnectionCall = ConnectionCallInitiateResult & {
  startedAt: number;
  peerDisplayName: string;
  peerImage: string | null;
  status: 'ringing' | 'connected';
};
