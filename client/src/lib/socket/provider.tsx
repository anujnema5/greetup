'use client';
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TSocketContext } from "./provider.types";
import { getAppSocketPair } from "./socket-instances";

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
    const [connectionState, setConnectionState] = useState({
        pending: false,
        connected: false,
        status: 'disconnected'
    });

    // Auth is cookie-based — sockets are created once per tab, not on every session re-render.
    const { socket, chatSocket } = useMemo(() => {
        const { main, chat } = getAppSocketPair(
            getOrCreateDeviceId(),
            Intl.DateTimeFormat().resolvedOptions().timeZone,
        );
        return { socket: main, chatSocket: chat };
    }, []);

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