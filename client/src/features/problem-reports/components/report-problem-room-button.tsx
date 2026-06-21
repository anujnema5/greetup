"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

import { CALL_STAGE_CHROME_BTN_CLASS } from "@/features/room/call/stage/top-bar";
import {
  IN_CALL_DIALOG_CONTENT_Z,
  IN_CALL_DIALOG_OVERLAY_Z,
} from "@/features/room/constants/call/in-call-dialog-layer";

import { ReportProblemModal } from "./report-problem-modal";

/** In-room stage-chrome button — opens the report modal (room surface) with best-effort room context. */
export function ReportProblemRoomButton({ roomId }: { roomId?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Report a problem"
        title="Report a problem"
        className={CALL_STAGE_CHROME_BTN_CLASS}
      >
        <Flag size={17} className="shrink-0" aria-hidden />
      </button>

      <ReportProblemModal
        open={open}
        onOpenChange={setOpen}
        surface="room"
        roomId={roomId}
        contentClassName={IN_CALL_DIALOG_CONTENT_Z}
        overlayClassName={IN_CALL_DIALOG_OVERLAY_Z}
      />
    </>
  );
}
