"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { syncConnectionFromNotification } from "@/features/connections/lib/realtime";
import { baseApi } from "@/lib/api";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useSocket } from "@/lib/socket";
import { notificationInvalidationTags } from "../constants";

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
  const dispatch = useAppDispatch();
  const { socket } = useSocket();

  useEffect(() => {
    const invalidateNotificationCaches = () => {
      dispatch(baseApi.util.invalidateTags(notificationInvalidationTags));
    };

    const onRealtimeSync = () => {
      invalidateNotificationCaches();
    };

    const onNotificationNew = (payload?: NotificationSocketPayload) => {
      invalidateNotificationCaches();
      syncConnectionFromNotification(dispatch, payload?.notification);
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
  }, [dispatch, socket]);

  return null;
}
