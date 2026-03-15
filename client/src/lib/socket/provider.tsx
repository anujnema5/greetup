'use client';
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TSocketContext } from "./provider.types";
import { io } from "socket.io-client";
import { SOCKET_SERVER_URL } from "@/shared/constants/environments";
import { authClient, useSession } from "@/lib/auth-client";

const SocketContext = createContext<TSocketContext | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { data, error } = useSession();
    if (error) {
        // throw new Error(`User not authenticated, ${error}`)
        // console.error(`User not authenticated, ${error}`);
    };

    const [connectionState, setConnectionState] = useState({
        pending: false,
        connected: false,
        status: 'disconnected'
    });

    const socket = useMemo(() => io(
        SOCKET_SERVER_URL, {
        autoConnect: true,
        // reconnection: true,
        reconnectionDelay: 2000,
        timeout: 10000,
        reconnectionDelayMax: 5000,
        transports: ["websocket", "polling"],
        query: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            userId: data?.user.id
        },
        withCredentials: true,
        forceNew: false,
    }
    ), [data?.user.id]);

    useEffect(() => {
        socket.on('connect', () => {
            console.log(`Socket Connected ${socket.id}`);
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
        try {
            if (socket.connected) {
                console.log("Disconnecting socket...");
                socket.disconnect();
                setConnectionState({
                    connected: false,
                    status: 'disconnected',
                    pending: false
                });
            } else {
                console.log("Socket is already disconnected");
            }
        } catch (error) {
            console.error("Error disconnecting socket:", error);
        }
    }

    const forceReconnect = () => {
        try {
            if (socket.connected) {
                console.log("Forcing socket to reconnect...");
                socket.disconnect();
                setConnectionState({
                    connected: false,
                    status: 'connecting',
                    pending: true
                });
            }

            socket.connect();
        } catch (error) {
            console.error("Error forcing socket reconnection:", error);
        }
    };

    return (
        <SocketContext.Provider value={{ socket, connectionState, disconnectSocket, forceReconnect }}>
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