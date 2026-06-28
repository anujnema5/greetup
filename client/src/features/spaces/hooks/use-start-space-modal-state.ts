"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useMyConnections } from "@/features/connections/api/connections.queries";
import {
  useCreateSpace,
  useDeleteScheduledSpace,
  useUpdateScheduledSpace,
} from "@/features/spaces/api/spaces.mutations";
import { useListSpaceCategories, useListSpaceActivityOptions } from "@/features/spaces/api/spaces.queries";
import { START_SPACE_COPY as C } from "@/features/spaces/constants/start-space-copy";
import {
  buildActivitySelectionsPayload,
  toggleSessionActivityId,
  validateSessionActivitySelections,
} from "@/features/matching/utils/session-activities.utils";
import { filterStartSpaceCategories } from "@/features/spaces/lib/start-space-categories";
import { combineDateAndTime } from "@/features/spaces/lib/start-space-utils";
import {
  getDefaultStartSpaceFormValues,
  getStartSpaceFormValuesFromActiveSpace,
  startSpaceFormSchema,
  type StartSpaceFormValues,
} from "@/features/spaces/schemas/start-space-form.schema";
import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";
import { toApiAdvancedOptions, normalizeMeetingStartExclusivity } from "@/features/spaces/types/start-space-ui.types";
import { getApiErrorMessage } from "@/lib/api/fetch-client";

const MAX_SPACE_ACTIVITIES = 5;

export type StartSpaceShellValue = {
  openModal: () => void;
  openModalForEdit: (space: ActiveSpaceItem) => void;
  categoriesLoading: boolean;
  isOpen: boolean;
};

export function useStartSpaceModalState() {
  const [open, setOpen] = useState(false);
  const [editSpace, setEditSpace] = useState<ActiveSpaceItem | null>(null);
  const editSnapshotRef = useRef<ActiveSpaceItem | null>(null);

  const editRoomId = editSpace?.id ?? null;
  const isEditMode = editRoomId !== null;

  const openModal = useCallback(() => {
    editSnapshotRef.current = null;
    setEditSpace(null);
    setOpen(true);
  }, []);

  const openModalForEdit = useCallback((space: ActiveSpaceItem) => {
    if (space.status !== "scheduled" || !space.scheduledStartAt) return;
    editSnapshotRef.current = space;
    setEditSpace(space);
    setOpen(true);
  }, []);

  const {
    data: categoriesRes,
    isFetching: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useListSpaceCategories(open);

  const {
    data: activityOptionsRes,
    isFetching: activitiesLoading,
  } = useListSpaceActivityOptions(open);

  const activityOptions = activityOptionsRes?.activities ?? [];

  const { data: connectionsRes, isFetching: connectionsLoading } = useMyConnections(
    { filter: "accepted" },
    { enabled: open },
  );

  const { mutateAsync: createSpace, isPending: creating } = useCreateSpace();
  const { mutateAsync: updateScheduledSpace, isPending: updating } =
    useUpdateScheduledSpace();
  const { mutateAsync: deleteScheduledSpace, isPending: deleting } =
    useDeleteScheduledSpace();

  const connections = connectionsRes?.items ?? [];
  const categories = useMemo(
    () => filterStartSpaceCategories(categoriesRes?.categories ?? []),
    [categoriesRes?.categories],
  );

  const form = useForm<StartSpaceFormValues>({
    resolver: zodResolver(startSpaceFormSchema),
    defaultValues: getDefaultStartSpaceFormValues(),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [invitedPeerIds, setInvitedPeerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [activityDetails, setActivityDetails] = useState<Record<string, string>>({});

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

  const toggleActivity = useCallback((id: string) => {
    setSelectedActivityIds((prev) => {
      const next = toggleSessionActivityId(prev, id, MAX_SPACE_ACTIVITIES);
      if (next === prev) return prev;
      if (!next.has(id)) {
        setActivityDetails((d) => {
          const copy = { ...d };
          delete copy[id];
          return copy;
        });
      }
      return next;
    });
  }, []);

  const handleActivityDetailChange = useCallback((id: string, value: string) => {
    setActivityDetails((prev) => ({ ...prev, [id]: value }));
  }, []);

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
      form.reset(getStartSpaceFormValuesFromActiveSpace(snap));
      setInvitedPeerIds(new Set(snap.pendingInviteeIds ?? []));
    } else {
      form.reset(getDefaultStartSpaceFormValues());
      setInvitedPeerIds(new Set());
      setSelectedActivityIds(new Set());
      setActivityDetails({});
    }
  }, [open, form]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        editSnapshotRef.current = null;
        setEditSpace(null);
        setInviteDialogOpen(false);
        form.reset(getDefaultStartSpaceFormValues());
        setAdvancedOpen(false);
        setInvitedPeerIds(new Set());
        setSelectedActivityIds(new Set());
        setActivityDetails({});
      }
    },
    [form],
  );

  const handleDeleteScheduled = useCallback(async () => {
    if (!editRoomId) return;
    if (!window.confirm(C.confirmDeleteScheduled)) return;
    try {
      await deleteScheduledSpace(editRoomId);
      toast.success(C.toastDeleted);
      handleOpenChange(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, C.toastDeleteError));
    }
  }, [editRoomId, deleteScheduledSpace, handleOpenChange]);

  const submitSpaceForm = useCallback(
    async (data: StartSpaceFormValues) => {
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
          await updateScheduledSpace({
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
          });
          toast.success(C.toastUpdated);
          handleOpenChange(false);
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, C.toastUpdateError));
        }
        return;
      }

      const inviteCap = data.maxParticipants - 1;
      if (invitedPeerIds.size > inviteCap) {
        toast.error(C.toastInvitesExceedSeats(inviteCap));
        return;
      }
      const activityError = validateSessionActivitySelections(
        activityOptions,
        selectedActivityIds,
        activityDetails,
        { maxCount: MAX_SPACE_ACTIVITIES },
      );
      if (activityError) {
        toast.error(activityError);
        return;
      }
      const activitySelections = buildActivitySelectionsPayload(
        selectedActivityIds,
        activityDetails,
      );
      try {
        const res = await createSpace({
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
          ...(activitySelections.length > 0 ? { activitySelections } : {}),
        });

        const invite = res.data.room.inviteCode;
        const n = res.data.friendInvitesCreated ?? 0;
        const inviteLine = invite
          ? `Invite code: ${invite} · Share it for private joins.`
          : "You are live — others can discover this space.";
        const friendsLine =
          n > 0 ? `${n} friend invite${n === 1 ? "" : "s"} sent.` : null;
        toast.success(res.message ?? "Space created", {
          description: [inviteLine, friendsLine].filter(Boolean).join(" "),
        });
        setInviteDialogOpen(false);
        handleOpenChange(false);
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, C.toastCreateError));
      }
    },
    [
      isEditMode,
      editRoomId,
      invitedPeerIds,
      createSpace,
      updateScheduledSpace,
      handleOpenChange,
      activityOptions,
      selectedActivityIds,
      activityDetails,
    ],
  );

  const shell = useMemo<StartSpaceShellValue>(
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
    submitSpaceForm,
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
    activityOptions,
    activitiesLoading,
    selectedActivityIds,
    activityDetails,
    toggleActivity,
    handleActivityDetailChange,
  };
}

export type StartSpaceModalState = ReturnType<typeof useStartSpaceModalState>;
