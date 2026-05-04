"use client";

import { Button } from "@/components/ui/button";
import { RoomActivityLayout } from "@/features/room/components/room-activity/room-activity-layout";

type GenericActivityStageProps = {
  label: string;
  onExit: () => void;
  peerLabel: string;
  myName: string;
  peerInitials: string;
  remoteVideoLive: boolean;
  localVideoLive: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  remoteMicOff?: boolean;
  remoteCameraOff?: boolean;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
};

export function GenericActivityStage({
  label,
  onExit,
  peerLabel,
  myName,
  peerInitials,
  remoteVideoLive,
  localVideoLive,
  remoteStream,
  localStream,
  remoteMicOff = false,
  remoteCameraOff = false,
  micEnabled = true,
  cameraEnabled = true,
}: GenericActivityStageProps) {
  return (
    <RoomActivityLayout
      title={label}
      subtitle="Activity is live"
      peerLabel={peerLabel}
      myName={myName}
      peerInitials={peerInitials}
      remoteVideoLive={remoteVideoLive}
      localVideoLive={localVideoLive}
      remoteStream={remoteStream}
      localStream={localStream}
      remoteMicOff={remoteMicOff}
      remoteCameraOff={remoteCameraOff}
      micEnabled={micEnabled}
      cameraEnabled={cameraEnabled}
      sidePanel={
        <div className="rounded-lg border border-border/60 bg-background/75 px-2 py-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
          <p className="mt-1 text-xs text-foreground">You are currently in {label.toLowerCase()} mode.</p>
        </div>
      }
      actions={
        <Button type="button" variant="outline" onClick={onExit}>
          Exit activity
        </Button>
      }
    >
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-border/70 bg-background/85 px-6 text-center">
        <p className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-primary">
          ACTIVITY LIVE
        </p>
        <h3 className="mt-4 text-2xl font-semibold text-foreground md:text-3xl">{label}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The call shell stays the same while this center panel adapts to the selected activity.
        </p>
      </div>
    </RoomActivityLayout>
  );
}
