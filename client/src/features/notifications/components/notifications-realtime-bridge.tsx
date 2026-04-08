"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

import { baseApi } from "@/lib/api";
import { useSocket } from "@/lib/socket";
import { notificationInvalidationTags } from "../constants";

type NotificationSocketPayload = {
  notification?: {
    id?: string;
    title?: string;
    body?: string;
  };
};

export function NotificationsRealtimeBridge() {
  const dispatch = useDispatch();
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
