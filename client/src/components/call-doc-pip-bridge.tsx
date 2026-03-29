"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { endCall } from "@/lib/redux/slices/callSlice";
import {
  subscribeCallChannel,
  clearCallSession,
} from "@/lib/call/call-sync";
import { dismissDocumentPip } from "@/lib/call/document-pip";

/** Syncs Document PiP with BroadcastChannel (expand to full room, end call, etc.). */
export function CallDocPipBridge() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    return subscribeCallChannel((msg) => {
      if (msg.type === "REQUEST_FULL_ROOM") {
        dismissDocumentPip();
        return;
      }
      if (msg.type === "FULL_ROOM_FOREGROUND") {
        dismissDocumentPip();
        return;
      }
      if (msg.type === "END_CALL") {
        dismissDocumentPip();
        clearCallSession();
        dispatch(endCall());
      }
    });
  }, [dispatch]);

  return null;
}
