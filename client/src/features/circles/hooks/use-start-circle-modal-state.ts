"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useGetMyConnectionsQuery } from "@/features/connections/api/connections-api";
import {
  useCreateCircleMutation,
  useListCircleCategoriesQuery,
} from "@/features/circles/api/circles-api";
import { START_CIRCLE_COPY as C } from "@/features/circles/constants/start-circle-copy";
import { combineDateAndTime } from "@/features/circles/lib/start-circle-utils";
import {
  getDefaultStartCircleFormValues,
  startCircleFormSchema,
  type StartCircleFormValues,
} from "@/features/circles/schemas/start-circle-form.schema";
import { toApiAdvancedOptions } from "@/features/circles/types/start-circle-ui.types";

export type StartCircleShellValue = {
  openModal: () => void;
  categoriesLoading: boolean;
  isOpen: boolean;
};

/** Keeps the focused control visible inside the modal body when the mobile keyboard changes `visualViewport`. */
function scrollFocusedIntoFormScroll(scrollEl: HTMLElement, pad = 16) {
  const ae = document.activeElement;
  if (!ae || !(ae instanceof HTMLElement) || !scrollEl.contains(ae)) return;
  const s = scrollEl.getBoundingClientRect();
  const a = ae.getBoundingClientRect();
  if (a.bottom > s.bottom - pad) {
    scrollEl.scrollTop += a.bottom - s.bottom + pad;
  } else if (a.top < s.top + pad) {
    scrollEl.scrollTop += a.top - s.top - pad;
  }
}

export function useStartCircleModalState() {
  const [open, setOpen] = useState(false);
  const openModal = useCallback(() => setOpen(true), []);

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

  const connections = connectionsRes?.data?.items ?? [];
  const categories = categoriesRes?.data?.categories ?? [];

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

  const formScrollRef = useRef<HTMLDivElement>(null);
  const advancedSectionRef = useRef<HTMLDivElement>(null);

  const handleInviteConfirm = useCallback((ids: Set<string>) => {
    setInvitedPeerIds(ids);
  }, []);

  useEffect(() => {
    if (!open || !categories.length) return;
    const cid = form.getValues("categoryId");
    if (!cid) {
      form.setValue("categoryId", categories[0].id, { shouldValidate: false });
    }
  }, [open, categories, form]);

  useEffect(() => {
    if (!advancedOpen) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const scrollEl = formScrollRef.current;
        const anchor = advancedSectionRef.current;
        if (!scrollEl || !anchor) return;
        const s = scrollEl.getBoundingClientRect();
        const a = anchor.getBoundingClientRect();
        const pad = 12;
        if (a.bottom > s.bottom - pad) {
          scrollEl.scrollBy({
            top: a.bottom - s.bottom + pad,
            behavior: "smooth",
          });
        } else if (a.top < s.top + pad) {
          scrollEl.scrollBy({
            top: a.top - s.top - pad,
            behavior: "smooth",
          });
        }
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [advancedOpen]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      const el = formScrollRef.current;
      if (el) el.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onViewportChange = () => {
      requestAnimationFrame(() => {
        const scrollEl = formScrollRef.current;
        if (scrollEl) scrollFocusedIntoFormScroll(scrollEl);
      });
    };
    vv.addEventListener("resize", onViewportChange);
    vv.addEventListener("scroll", onViewportChange);
    return () => {
      vv.removeEventListener("resize", onViewportChange);
      vv.removeEventListener("scroll", onViewportChange);
    };
  }, [open]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        form.reset(getDefaultStartCircleFormValues(categories[0]?.id ?? ""));
        setAdvancedOpen(false);
        setInvitedPeerIds(new Set());
      } else {
        setInviteDialogOpen(false);
      }
    },
    [categories, form],
  );

  const submitCreateCircle = useCallback(
    async (data: StartCircleFormValues) => {
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
            : "You’re live — others can discover this circle.";
          const friendsLine =
            n > 0 ? `${n} friend invite${n === 1 ? "" : "s"} sent.` : null;
          toast.success(res.message, {
            description: [inviteLine, friendsLine].filter(Boolean).join(" "),
          });
          setInviteDialogOpen(false);
          setOpen(false);
        }
      } catch {
        toast.error(C.toastCreateError);
      }
    },
    [createCircle, invitedPeerIds],
  );

  const shell = useMemo<StartCircleShellValue>(
    () => ({
      openModal,
      categoriesLoading,
      isOpen: open,
    }),
    [openModal, categoriesLoading, open],
  );

  return {
    shell,
    open,
    handleOpenChange,
    form,
    submitCreateCircle,
    formScrollRef,
    advancedSectionRef,
    creating,
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
    setOpen,
  };
}

export type StartCircleModalState = ReturnType<typeof useStartCircleModalState>;
