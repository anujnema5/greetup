'use client';

import type { ReactNode } from 'react';
import { Phone, Video } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProfilePeerAvatar } from '@/lib/ui/profile-peer-avatar';
import { cn } from '@/lib/utils';

import type { ConnectionCallMode } from '../types/connection-call.types';

const CALL_DIALOG_Z = 'z-[260]';

const CALL_DIALOG_CONTENT_CLASS = cn(
  CALL_DIALOG_Z,
  'gap-4 sm:max-w-100',
  'data-[state=open]:animate-none data-[state=closed]:animate-none',
);

type ConnectionCallDialogShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  allowDismiss?: boolean;
};

export function ConnectionCallDialogShell({
  open,
  onOpenChange,
  children,
  allowDismiss = false,
}: ConnectionCallDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={CALL_DIALOG_CONTENT_CLASS}
        overlayClassName={cn(
          CALL_DIALOG_Z,
          'bg-black/50 data-[state=open]:animate-none data-[state=closed]:animate-none',
        )}
        showCloseButton={false}
        adaptVisualViewport={false}
        onInteractOutside={allowDismiss ? undefined : (event) => event.preventDefault()}
        onEscapeKeyDown={allowDismiss ? undefined : (event) => event.preventDefault()}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

type ConnectionCallDialogHeaderProps = {
  mode: ConnectionCallMode;
  title: string;
  description: string;
};

export function ConnectionCallDialogHeader({
  mode,
  title,
  description,
}: ConnectionCallDialogHeaderProps) {
  const isVideo = mode === 'video';

  return (
    <div className="flex items-start gap-3 pr-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
        {isVideo ? <Video className="h-4 w-4" aria-hidden /> : <Phone className="h-4 w-4" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <DialogTitle className="text-[13px] font-semibold leading-none text-foreground">{title}</DialogTitle>
        <DialogDescription className="mt-1 text-[12px] leading-snug">{description}</DialogDescription>
      </div>
    </div>
  );
}

export function callModeLabel(mode: ConnectionCallMode): string {
  return mode === 'video' ? 'Video call' : 'Audio call';
}

export function callModeHint(mode: ConnectionCallMode): string {
  return mode === 'video'
    ? 'Camera and microphone turn on when you accept.'
    : 'Microphone turns on when you accept.';
}

type CallPeerRowProps = {
  displayName: string;
  image: string | null;
  seed: string;
};

export function CallPeerRow({ displayName, image, seed }: CallPeerRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <ProfilePeerAvatar
        image={image}
        label={displayName}
        seed={seed}
        className="h-10 w-10 shrink-0 rounded-full"
      />
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{displayName}</p>
    </div>
  );
}

export function ConnectionCallDialogActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('flex gap-2', className)}>{children}</div>;
}
