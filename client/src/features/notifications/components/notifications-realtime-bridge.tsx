"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { syncConnectionFromNotification } from "@/features/connections/lib/realtime";
import { useSocket } from "@/lib/socket";

import { invalidateNotificationCaches } from "../lib/invalidate-notification-caches";

type NotificationSocketPayload = {
  notification?: {
    id?: string;
    title?: string;
    body?: string;
    type?: string;
    actorUserId?: string | null;
    entityId?: string;
    entityType?: string;
  };
};

export function NotificationsRealtimeBridge() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    const onRealtimeSync = () => {
      invalidateNotificationCaches(queryClient);
    };

    const onNotificationNew = (payload?: NotificationSocketPayload) => {
      invalidateNotificationCaches(queryClient);
      syncConnectionFromNotification(queryClient, payload?.notification);
      const title = payload?.notification?.title?.trim();
      const body = payload?.notification?.body?.trim();
      if (!title && !body) return;
      toast.info(title || "New notification", {
        description: body || undefined,
        id: payload?.notification?.id,
      });
    };

    socket.on("notification:new", onNotificationNew);
    socket.on("connect", onRealtimeSync);

    return () => {
      socket.off("notification:new", onNotificationNew);
      socket.off("connect", onRealtimeSync);
    };
  }, [queryClient, socket]);

  return null;
}
