'use client';
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TSocketContext } from "./provider.types";
import { io } from "socket.io-client";
import { SOCKET_SERVER_URL } from "@/shared/constants/environments";
import { authClient, useSession } from "@/lib/auth-client";

// One deviceId per browser tab, persists across page refreshes within the same tab.
// sessionStorage is scoped per-tab so two tabs always get different IDs.
// Guard against SSR — Next.js renders 'use client' components on the server too.
function getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return '';
    const key = 'socket:deviceId';
    let id = sessionStorage.getItem(key);
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(key, id);
    }
    return id;
}

const SocketContext = createContext<TSocketContext | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { data } = useSession();

    const [connectionState, setConnectionState] = useState({
        pending: false,
        connected: false,
        status: 'disconnected'
    });

    const socketOptions = useMemo(() => ({
        autoConnect: true,
        reconnectionDelay: 2000,
        timeout: 10000,
        reconnectionDelayMax: 5000,
        transports: ["websocket", "polling"] as string[],
        query: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            userId: data?.user.id,
            deviceId: getOrCreateDeviceId(),
        },
        withCredentials: true,
        forceNew: false,
    }), [data?.user.id]);

    // Global namespace — presence, match events, notifications
    const socket = useMemo(() => io(SOCKET_SERVER_URL, socketOptions), [socketOptions]);

    // Chat namespace — all chat:* events are isolated here
    const chatSocket = useMemo(() => io(`${SOCKET_SERVER_URL}/chat`, socketOptions), [socketOptions]);

    useEffect(() => {
        socket.on('connect', () => {
            setConnectionState({
                connected: true,
                status: 'connected',
                pending: false
            });
        });

        socket.on('disconnect', () => {
            setConnectionState({ connected: false, status: 'disconnected', pending: false });
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
            setConnectionState({ connected: false, status: 'error', pending: false });
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
        };
    }, [socket]);

    const disconnectSocket = () => {
        if (socket.connected) {
            socket.disconnect();
            setConnectionState({ connected: false, status: 'disconnected', pending: false });
        }
    };

    const forceReconnect = () => {
        if (socket.connected) {
            socket.disconnect();
            setConnectionState({ connected: false, status: 'connecting', pending: true });
        }
        socket.connect();
    };

    return (
        <SocketContext.Provider value={{ socket, chatSocket, connectionState, disconnectSocket, forceReconnect }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
};