"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useGetMyConnectionsQuery } from "@/features/connections/api/connections-api";
import {
  useCreateCircleMutation,
  useDeleteScheduledCircleMutation,
  useListCircleCategoriesQuery,
  useUpdateScheduledCircleMutation,
} from "@/features/circles/api/circles-api";
import { START_CIRCLE_COPY as C } from "@/features/circles/constants/start-circle-copy";
import { filterStartCircleCategories } from "@/features/circles/lib/start-circle-categories";
import { combineDateAndTime } from "@/features/circles/lib/start-circle-utils";
import {
  getDefaultStartCircleFormValues,
  getStartCircleFormValuesFromActiveCircle,
  startCircleFormSchema,
  type StartCircleFormValues,
} from "@/features/circles/schemas/start-circle-form.schema";
import type { ActiveCircleItem } from "@/features/circles/types/circles-api.types";
import { toApiAdvancedOptions, normalizeMeetingStartExclusivity } from "@/features/circles/types/start-circle-ui.types";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";

export type StartCircleShellValue = {
  openModal: () => void;
  openModalForEdit: (circle: ActiveCircleItem) => void;
  categoriesLoading: boolean;
  isOpen: boolean;
};

export function useStartCircleModalState() {
  const [open, setOpen] = useState(false);
  const [editCircle, setEditCircle] = useState<ActiveCircleItem | null>(null);
  const editSnapshotRef = useRef<ActiveCircleItem | null>(null);

  const editRoomId = editCircle?.id ?? null;
  const isEditMode = editRoomId !== null;

  const openModal = useCallback(() => {
    editSnapshotRef.current = null;
    setEditCircle(null);
    setOpen(true);
  }, []);

  const openModalForEdit = useCallback((circle: ActiveCircleItem) => {
    if (circle.status !== "scheduled" || !circle.scheduledStartAt) return;
    editSnapshotRef.current = circle;
    setEditCircle(circle);
    setOpen(true);
  }, []);

  const {
    data: categoriesRes,
    isFetching: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useListCircleCategoriesQuery(undefined, {
    skip: !open,
    refetchOnMountOrArgChange: true,
  });

  const { data: connectionsRes, isFetching: connectionsLoading } =
    useGetMyConnectionsQuery(
      { filter: "accepted" },
      { skip: !open, refetchOnMountOrArgChange: true },
    );

  const [createCircle, { isLoading: creating }] = useCreateCircleMutation();
  const [updateScheduledCircle, { isLoading: updating }] =
    useUpdateScheduledCircleMutation();
  const [deleteScheduledCircle, { isLoading: deleting }] =
    useDeleteScheduledCircleMutation();

  const connections = connectionsRes?.data?.items ?? [];
  const categories = useMemo(
    () => filterStartCircleCategories(categoriesRes?.data?.categories ?? []),
    [categoriesRes?.data?.categories],
  );

  const form = useForm<StartCircleFormValues>({
    resolver: zodResolver(startCircleFormSchema),
    defaultValues: getDefaultStartCircleFormValues(),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [invitedPeerIds, setInvitedPeerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const advancedSectionRef = useRef<HTMLDivElement>(null);

  const handleMaxParticipantsChange = useCallback((maxParticipants: number) => {
    const cap = Math.max(0, maxParticipants - 1);
    setInvitedPeerIds((prev) => {
      if (prev.size <= cap) return prev;
      const arr = Array.from(prev).slice(0, cap);
      toast.message(C.toastTrimmedInvites(prev.size - arr.length));
      return new Set(arr);
    });
  }, []);

  const maxParticipantsRaw = useWatch({
    control: form.control,
    name: "maxParticipants",
  });
  const maxParticipantsVal =
    typeof maxParticipantsRaw === "number" && !Number.isNaN(maxParticipantsRaw)
      ? maxParticipantsRaw
      : 8;
  const maxInviteSlots = Math.max(0, maxParticipantsVal - 1);

  const handleInviteConfirm = useCallback(
    (ids: Set<string>) => {
      if (ids.size <= maxInviteSlots) {
        setInvitedPeerIds(ids);
        return;
      }
      const arr = Array.from(ids).slice(0, maxInviteSlots);
      toast.message(C.toastTrimmedInvites(ids.size - arr.length));
      setInvitedPeerIds(new Set(arr));
    },
    [maxInviteSlots],
  );

  const scheduleModeWatch = useWatch({
    control: form.control,
    name: "scheduleMode",
  });

  useEffect(() => {
    if (scheduleModeWatch === "instant") {
      if (form.getValues("advanced.shouldMeetingAutoStart")) {
        form.setValue("advanced.shouldMeetingAutoStart", false, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      return;
    }
    if (scheduleModeWatch === "scheduled") {
      const host = form.getValues("advanced.shouldHostStartMeeting");
      const auto = form.getValues("advanced.shouldMeetingAutoStart");
      if (!host && !auto) {
        const n = normalizeMeetingStartExclusivity(false, true);
        form.setValue("advanced.shouldHostStartMeeting", n.shouldHostStartMeeting, {
          shouldDirty: true,
          shouldValidate: true,
        });
        form.setValue("advanced.shouldMeetingAutoStart", n.shouldMeetingAutoStart, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }
  }, [scheduleModeWatch, form]);

  const handleInviteAtCapacity = useCallback(() => {
    toast.info(C.inviteCapacityReachedToast(maxInviteSlots));
  }, [maxInviteSlots]);

  useEffect(() => {
    if (!open || !categories.length) return;
    if (isEditMode) return;
    const cid = form.getValues("categoryId");
    if (!cid) {
      form.setValue("categoryId", categories[0].id, { shouldValidate: false });
    }
  }, [open, categories, form, isEditMode]);

  useEffect(() => {
    if (!open || !advancedOpen) return;
    const id = window.requestAnimationFrame(() => {
      advancedSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, advancedOpen]);

  /** Whenever the sheet opens, reset form for create vs edit (stable snapshot for edit). */
  useEffect(() => {
    if (!open) return;
    const snap = editSnapshotRef.current;
    setAdvancedOpen(snap !== null);
    if (snap) {
      form.reset(getStartCircleFormValuesFromActiveCircle(snap));
      setInvitedPeerIds(new Set(snap.pendingInviteeIds ?? []));
    } else {
      form.reset(getDefaultStartCircleFormValues());
      setInvitedPeerIds(new Set());
    }
  }, [open, form]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        editSnapshotRef.current = null;
        setEditCircle(null);
        setInviteDialogOpen(false);
        form.reset(getDefaultStartCircleFormValues());
        setAdvancedOpen(false);
        setInvitedPeerIds(new Set());
      }
    },
    [form],
  );

  const handleDeleteScheduled = useCallback(async () => {
    if (!editRoomId) return;
    if (!window.confirm(C.confirmDeleteScheduled)) return;
    try {
      await deleteScheduledCircle(editRoomId).unwrap();
      toast.success(C.toastDeleted);
      handleOpenChange(false);
    } catch (err: unknown) {
      toast.error(getRtkMutationErrorMessage(err, C.toastDeleteError));
    }
  }, [editRoomId, deleteScheduledCircle, handleOpenChange]);

  const submitCircleForm = useCallback(
    async (data: StartCircleFormValues) => {
      if (isEditMode && editRoomId) {
        if (!data.scheduleDate) {
          toast.error(C.toastPickDate);
          return;
        }
        const inviteCap = data.maxParticipants - 1;
        if (invitedPeerIds.size > inviteCap) {
          toast.error(C.toastInvitesExceedSeats(inviteCap));
          return;
        }
        const snap = editSnapshotRef.current;
        const serverPending = new Set(snap?.pendingInviteeIds ?? []);
        const invitesUnchanged =
          snap != null &&
          invitedPeerIds.size === serverPending.size &&
          [...invitedPeerIds].every((id) => serverPending.has(id));
        try {
          await updateScheduledCircle({
            roomId: editRoomId,
            body: {
              title: data.title.trim(),
              scheduledStartAt: combineDateAndTime(
                data.scheduleDate,
                data.scheduleTime,
              ).toISOString(),
              categoryId: data.categoryId,
              description: data.description.trim() || null,
              visibility: data.visibility,
              maxParticipants: data.maxParticipants,
              advancedOptions: toApiAdvancedOptions(data.advanced),
              ...(invitesUnchanged
                ? {}
                : { invitedUserIds: Array.from(invitedPeerIds) }),
            },
          }).unwrap();
          toast.success(C.toastUpdated);
          handleOpenChange(false);
        } catch (err: unknown) {
          toast.error(getRtkMutationErrorMessage(err, C.toastUpdateError));
        }
        return;
      }

      const inviteCap = data.maxParticipants - 1;
      if (invitedPeerIds.size > inviteCap) {
        toast.error(C.toastInvitesExceedSeats(inviteCap));
        return;
      }
      try {
        const res = await createCircle({
          categoryId: data.categoryId,
          title: data.title.trim(),
          description: data.description.trim() || undefined,
          visibility: data.visibility,
          maxParticipants: data.maxParticipants,
          scheduleMode: data.scheduleMode,
          scheduledStartAt:
            data.scheduleMode === "scheduled" && data.scheduleDate
              ? combineDateAndTime(
                  data.scheduleDate,
                  data.scheduleTime,
                ).toISOString()
              : undefined,
          advancedOptions: toApiAdvancedOptions(data.advanced),
          invitedUserIds:
            invitedPeerIds.size > 0 ? Array.from(invitedPeerIds) : undefined,
        }).unwrap();

        if (res.success) {
          const invite = res.data.room.inviteCode;
          const n = res.data.friendInvitesCreated ?? 0;
          const inviteLine = invite
            ? `Invite code: ${invite} · Share it for private joins.`
            : "You are live — others can discover this circle.";
          const friendsLine =
            n > 0 ? `${n} friend invite${n === 1 ? "" : "s"} sent.` : null;
          toast.success(res.message, {
            description: [inviteLine, friendsLine].filter(Boolean).join(" "),
          });
          setInviteDialogOpen(false);
          handleOpenChange(false);
        }
      } catch (err: unknown) {
        toast.error(getRtkMutationErrorMessage(err, C.toastCreateError));
      }
    },
    [
      isEditMode,
      editRoomId,
      invitedPeerIds,
      createCircle,
      updateScheduledCircle,
      handleOpenChange,
    ],
  );

  const shell = useMemo<StartCircleShellValue>(
    () => ({
      openModal,
      openModalForEdit,
      categoriesLoading,
      isOpen: open,
    }),
    [openModal, openModalForEdit, categoriesLoading, open],
  );

  return {
    shell,
    open,
    handleOpenChange,
    form,
    submitCircleForm,
    advancedSectionRef,
    creating,
    updating,
    deleting,
    isEditMode,
    handleDeleteScheduled,
    categoriesLoading,
    categoriesError,
    refetchCategories,
    categories,
    advancedOpen,
    setAdvancedOpen,
    invitedPeerIds,
    connections,
    connectionsLoading,
    inviteDialogOpen,
    setInviteDialogOpen,
    handleInviteConfirm,
    handleMaxParticipantsChange,
    handleInviteAtCapacity,
    maxInviteSlots,
  };
}

export type StartCircleModalState = ReturnType<typeof useStartCircleModalState>;
