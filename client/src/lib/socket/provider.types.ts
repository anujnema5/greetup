import { Socket } from "socket.io-client"

export type TSocketContext = {
    socket: Socket,
    connectionState: {
        connected: boolean;
        status: string;
        pending: boolean
    },
    disconnectSocket: () => void;
    forceReconnect: () => void;
} 