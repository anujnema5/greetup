"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateScheduledCircleMutation } from "@/features/circles/api/circles-api";
import type { ActiveCircleItem } from "@/features/circles/types/circles-api.types";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type EditScheduledCircleDialogProps = {
  circle: ActiveCircleItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditScheduledCircleDialog({
  circle,
  open,
  onOpenChange,
}: EditScheduledCircleDialogProps) {
  const [title, setTitle] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [updateScheduledCircle, { isLoading }] = useUpdateScheduledCircleMutation();

  useEffect(() => {
    if (!open || !circle?.scheduledStartAt) return;
    setTitle(circle.title);
    setStartLocal(toDatetimeLocalValue(circle.scheduledStartAt));
  }, [open, circle]);

  const handleSave = useCallback(async () => {
    if (!circle?.scheduledStartAt) return;
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Title is required");
      return;
    }
    const nextIso = new Date(startLocal).toISOString();
    if (Number.isNaN(new Date(startLocal).getTime())) {
      toast.error("Invalid start time");
      return;
    }
    try {
      await updateScheduledCircle({
        roomId: circle.id,
        body: {
          title: trimmed,
          scheduledStartAt: nextIso,
        },
      }).unwrap();
      toast.success("Circle updated");
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(getRtkMutationErrorMessage(e, "Could not update circle"));
    }
  }, [circle, title, startLocal, updateScheduledCircle, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {circle ? (
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit scheduled circle</DialogTitle>
          <DialogDescription>
            Change the title or start time. The circle must stay in the future.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-circle-title">Title</Label>
            <Input
              id="edit-circle-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-circle-start">Starts</Label>
            <Input
              id="edit-circle-start"
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={isLoading}>
            {isLoading ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
      ) : null}
    </Dialog>
  );
}
