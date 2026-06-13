import type { Socket } from 'socket.io-client';

export type AppSocketConnectQuery = {
  deviceId: string;
  timezone: string;
};

export type AppSocketPair = {
  main: Socket;
  chat: Socket;
};
