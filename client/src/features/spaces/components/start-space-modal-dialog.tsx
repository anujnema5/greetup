"use client";

import { format, startOfDay } from "date-fns";
import { CalendarIcon, ChevronDown, Loader2, Lock, Globe2, UsersRound } from "lucide-react";
import { useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  COMPACT_DIALOG_CAPTION,
  COMPACT_DIALOG_DESCRIPTION,
  COMPACT_DIALOG_HINT,
  COMPACT_DIALOG_ICON_WRAP,
  COMPACT_DIALOG_LABEL,
  COMPACT_DIALOG_SECTION_TITLE,
  COMPACT_DIALOG_TITLE,
} from "@/lib/ui/compact-dialog-typography";
import { LAUNCH_MAX_SPACE_PARTICIPANTS } from "@/features/spaces/constants/space-capacity";
import { scheduleTimeMeaningNote } from "@/features/spaces/constants/scheduled-space-join-grace";
import { START_SPACE_COPY as C } from "@/features/spaces/constants/start-space-copy";
import { SessionActivitiesBlock } from "@/features/matching/components/match-prep-dialog-parts";
import type { StartSpaceModalState } from "@/features/spaces/hooks/use-start-space-modal-state";

export type StartSpaceModalDialogProps = Omit<
  StartSpaceModalState,
  "shell" | "inviteDialogOpen" | "handleInviteConfirm"
>;

export function StartSpaceModalDialog(props: StartSpaceModalDialogProps) {
  const {
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
    setInviteDialogOpen,
    maxInviteSlots,
    handleInviteAtCapacity,
    handleMaxParticipantsChange,
    activityOptions,
    activitiesLoading,
    selectedActivityIds,
    activityDetails,
    toggleActivity,
    handleActivityDetailChange,
  } = props;

  const scheduleMode = useWatch({
    control: form.control,
    name: "scheduleMode",
  });
  const categoryId = useWatch({ control: form.control, name: "categoryId" });

  const busy = creating || updating;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "flex max-h-[min(90dvh,760px)] flex-col gap-0 overflow-hidden p-0",
          "border-border/60 bg-card shadow-2xl sm:max-w-2xl",
          "rounded-2xl",
        )}
      >
        <div className="shrink-0 px-6 pt-6 sm:px-8 sm:pt-8">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
              {isEditMode ? C.modalTitleEdit : C.modalTitle}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground sm:text-[15px] sm:leading-relaxed">
              {isEditMode ? C.modalDescriptionEdit : C.modalDescription}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submitSpaceForm)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 sm:px-8">
              <div className="flex flex-col gap-5 pb-4 pt-4 sm:gap-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={COMPACT_DIALOG_LABEL}>
                    {C.titleLabel}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={C.titlePlaceholder}
                      maxLength={160}
                      className="h-10 border-border/80 bg-background/50 px-3 text-sm sm:h-11 sm:px-3.5"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid items-stretch gap-5 sm:grid-cols-2 sm:gap-x-6">
                  <div className="flex min-h-0 flex-col gap-2 sm:min-w-0">
                    {categoriesLoading ? (
                      <>
                        <p className={COMPACT_DIALOG_LABEL}>{C.categoryLabel}</p>
                        <div className="flex h-11 items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 text-sm text-muted-foreground">
                          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                          {C.categoriesLoading}
                        </div>
                      </>
                    ) : categoriesError ? (
                      <>
                        <p className="text-sm font-medium">{C.categoryLabel}</p>
                        <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-3 text-sm">
                          <p className="font-medium text-destructive">
                            {C.categoriesErrorTitle}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2 cursor-pointer"
                            onClick={() => void refetchCategories()}
                          >
                            {C.categoriesRetry}
                          </Button>
                        </div>
                      </>
                    ) : categories.length === 0 ? (
                      <>
                        <p className="text-sm font-medium">{C.categoryLabel}</p>
                        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-3 text-sm text-muted-foreground">
                          {C.categoriesEmpty}
                        </div>
                      </>
                    ) : (
                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              {C.categoryLabel}
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 w-full cursor-pointer border-border/80 bg-background/50 transition-[border-color,box-shadow] hover:bg-background/80">
                                  <SelectValue placeholder="Choose a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    <span className="flex items-center gap-2">
                                      {c.emoji ? (
                                        <span className="text-sm leading-none">
                                          {c.emoji}
                                        </span>
                                      ) : null}
                                      <span>{c.displayName}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          {C.whoCanJoinLabel}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 w-full cursor-pointer border-border/80 bg-background/50 transition-[border-color,box-shadow] hover:bg-background/80">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">
                              <span className="flex items-center gap-2">
                                <Globe2 className="size-4 shrink-0 opacity-80" />
                                {C.visibilityPublic}
                              </span>
                            </SelectItem>
                            <SelectItem value="private">
                              <span className="flex items-center gap-2">
                                <Lock className="size-4 shrink-0 opacity-80" />
                                {C.visibilityPrivate}
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid items-stretch gap-5 sm:grid-cols-2 sm:gap-x-6">
                  <FormField
                    control={form.control}
                    name="maxParticipants"
                    render={({ field }) => (
                      <FormItem className="grid gap-0">
                        <div className="flex flex-col gap-2">
                          <FormLabel
                            htmlFor="max-p"
                            className={COMPACT_DIALOG_LABEL}
                          >
                            {C.seatsLabel}
                          </FormLabel>
                          <FormControl>
                            <Input
                              id="max-p"
                              type="number"
                              min={2}
                              max={LAUNCH_MAX_SPACE_PARTICIPANTS}
                              className="h-11 w-full max-w-full border-border/80 bg-background/50 transition-[border-color,box-shadow] sm:max-w-36"
                              {...field}
                              onChange={(e) => {
                                const next = Math.min(
                                  LAUNCH_MAX_SPACE_PARTICIPANTS,
                                  Math.max(2, Number(e.target.value) || 2),
                                );
                                field.onChange(next);
                                handleMaxParticipantsChange(next);
                              }}
                              value={field.value}
                            />
                          </FormControl>
                        </div>
                        <p className={cn("mt-1.5", COMPACT_DIALOG_HINT)}>
                          {C.seatsHint}
                        </p>
                        <FormMessage className="mt-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduleMode"
                    render={({ field }) => (
                      <FormItem className="grid gap-0">
                        <div className="flex flex-col gap-2">
                          <FormLabel className="text-sm font-medium">
                            {C.whenLabel}
                          </FormLabel>
                          <Select
                            disabled={isEditMode}
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 w-full cursor-pointer border-border/80 bg-background/50 transition-[border-color,box-shadow] hover:bg-background/80">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="instant">
                                {C.whenStartNow}
                              </SelectItem>
                              <SelectItem value="scheduled">
                                {C.whenScheduleLater}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <FormMessage className="mt-1" />
                      </FormItem>
                    )}
                  />
                </div>

                {scheduleMode === "scheduled" && (
                  <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                    <FormField
                      control={form.control}
                      name="scheduleDate"
                      render={({ field }) => (
                        <FormItem className="min-w-0 flex-1 space-y-1">
                          <FormLabel className={cn(COMPACT_DIALOG_CAPTION, "font-medium leading-none")}>
                            {C.scheduleDateLabel}
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-11 w-full cursor-pointer justify-start gap-2 border-border/80 bg-background/80 px-3.5 text-left text-sm font-normal transition-[border-color,box-shadow] hover:bg-background"
                                >
                                  <CalendarIcon className="size-4 shrink-0 opacity-70" aria-hidden />
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span className="text-muted-foreground">
                                      {C.schedulePickDate}
                                    </span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="z-100 w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < startOfDay(new Date())
                                }
                                defaultMonth={field.value}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scheduleTime"
                      render={({ field }) => (
                        <FormItem className="w-full shrink-0 space-y-1 sm:w-40">
                          <FormLabel
                            htmlFor="space-schedule-time"
                            className={cn(COMPACT_DIALOG_CAPTION, "font-medium leading-none")}
                          >
                            {C.scheduleTimeLabel}
                          </FormLabel>
                          <FormControl>
                            <Input
                              id="space-schedule-time"
                              type="time"
                              className="h-11 border-border/80 bg-background/80 transition-[border-color,box-shadow] focus-visible:border-border"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    </div>
                    {/* <p className="border-t border-border/40 pt-3 text-[11px] leading-relaxed text-muted-foreground">
                      {scheduleTimeMeaningNote()}
                    </p> */}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn(COMPACT_DIALOG_LABEL, "text-muted-foreground")}>
                        {C.descriptionLabel}{" "}
                        <span className="font-normal">
                          {C.descriptionOptional}
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={C.descriptionPlaceholder}
                          rows={3}
                          maxLength={2000}
                          className="min-h-22 resize-none border-border/80 bg-background/50 p-3.5 text-sm leading-relaxed transition-[border-color,box-shadow] focus-visible:border-border"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isEditMode && (
                  <div className="space-y-2">
                    {activitiesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                        {C.activitiesLoading}
                      </div>
                    ) : activityOptions.length > 0 ? (
                      <>
                        <SessionActivitiesBlock
                          rows={activityOptions}
                          selectedIds={selectedActivityIds}
                          activityDetails={activityDetails}
                          onToggle={toggleActivity}
                          onDetailChange={handleActivityDetailChange}
                          required={false}
                        />
                        <p className={COMPACT_DIALOG_HINT}>{C.activitiesHint}</p>
                      </>
                    ) : null}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/10 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {C.inviteFriendsTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {connectionsLoading
                        ? C.inviteSubtitleLoading
                        : connections.length === 0
                          ? C.inviteSubtitleNoConnections
                          : invitedPeerIds.size > 0
                            ? C.inviteSubtitleWithCap(
                                invitedPeerIds.size,
                                maxInviteSlots,
                              )
                            : C.inviteSubtitleChoose}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="shrink-0 cursor-pointer"
                    onClick={() => setInviteDialogOpen(true)}
                    disabled={connectionsLoading}
                  >
                    {C.inviteButton}
                  </Button>
                </div>

                <div ref={advancedSectionRef} className="space-y-3 scroll-mt-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setAdvancedOpen((o) => !o)}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground",
                        COMPACT_DIALOG_HINT,
                      )}
                    >
                      {C.moreOptions}
                      <ChevronDown
                        className={cn(
                          "size-3.5 opacity-70 transition-transform",
                          advancedOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </div>

                  {advancedOpen && (
                    <div className="overflow-hidden rounded-xl border border-border/40 bg-muted/10">
                      <FormField
                        control={form.control}
                        name="advanced.shouldHostStartMeeting"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 border-b border-border/40 bg-background/30 px-4 py-3.5">
                            <div className="min-w-0 space-y-0.5">
                              <FormLabel className={COMPACT_DIALOG_SECTION_TITLE}>
                                {C.advancedHostStartsMeetingLabel}
                              </FormLabel>
                              <p className={COMPACT_DIALOG_HINT}>
                                {C.advancedHostStartsMeetingHint}
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(next) => {
                                  field.onChange(next);
                                  if (next) {
                                    form.setValue("advanced.shouldMeetingAutoStart", false, {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    });
                                  }
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="advanced.shouldMeetingAutoStart"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 border-b border-border/40 bg-background/30 px-4 py-3.5">
                            <div className="min-w-0 space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                {C.advancedMeetingAutoStartLabel}
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                {scheduleMode === "scheduled"
                                  ? C.advancedMeetingAutoStartHint
                                  : C.advancedMeetingAutoStartInstantHint}
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                disabled={scheduleMode !== "scheduled"}
                                onCheckedChange={(next) => {
                                  field.onChange(next);
                                  if (next) {
                                    form.setValue("advanced.shouldHostStartMeeting", false, {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    });
                                  }
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      {/*
                      <FormField
                        control={form.control}
                        name="advanced.hostControlsActiveSpeaker"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 border-b border-border/40 bg-background/30 px-4 py-3.5">
                            <div className="min-w-0 space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                {C.advancedHostControlsSpeakerLabel}
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                {C.advancedHostControlsSpeakerHint}
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      */}
                      {/*
                      <FormField
                        control={form.control}
                        name="advanced.spaceExpirationMinutes"
                        render={({ field }) => (
                          <FormItem className="space-y-2 border-b border-border/40 bg-background/30 px-4 py-3.5">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                Cancel if not started (minutes)
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Optional cap for scheduled spaces.
                              </p>
                            </div>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="No limit"
                                className="h-11 max-w-full border-border/80 bg-background/80 transition-[border-color,box-shadow] sm:max-w-44"
                                {...field}
                                value={field.value}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      */}
                      <FormField
                        control={form.control}
                        name="advanced.deleteSpaceAfterCall"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 border-b border-border/40 bg-background/30 px-4 py-3.5">
                            <div className="min-w-0 space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                Delete after call
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Remove this space when it ends.
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

              </div>
            </div>

            <DialogFooter className="shrink-0 flex w-full flex-col gap-2 border-t border-border/60 bg-card/95 px-6 pt-4 pb-6 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
              {isEditMode ? (
                <>
                  {/* Mobile: Cancel → Delete scheduled space → Save changes */}
                  <div className="flex w-full flex-col gap-2 sm:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full cursor-pointer"
                      onClick={() => handleOpenChange(false)}
                    >
                      {C.cancel}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full min-w-36 cursor-pointer"
                      disabled={deleting || busy}
                      onClick={() => void handleDeleteScheduled()}
                    >
                      {deleting ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                          {C.deleteWorking}
                        </span>
                      ) : (
                        C.deleteSpace
                      )}
                    </Button>
                    <Button
                      type="submit"
                      disabled={busy || deleting}
                      className="w-full min-w-36 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {busy ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                          {C.saveWorking}
                        </span>
                      ) : (
                        C.saveChanges
                      )}
                    </Button>
                  </div>
                  {/* Desktop: Delete left · Cancel + Save right */}
                  <div className="hidden w-full items-center justify-between gap-3 sm:flex">
                    <Button
                      type="button"
                      variant="destructive"
                      className="min-w-36 shrink-0 cursor-pointer sm:w-auto"
                      disabled={deleting || busy}
                      onClick={() => void handleDeleteScheduled()}
                    >
                      {deleting ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                          {C.deleteWorking}
                        </span>
                      ) : (
                        C.deleteSpace
                      )}
                    </Button>
                    <div className="flex flex-row gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer sm:w-auto"
                        onClick={() => handleOpenChange(false)}
                      >
                        {C.cancel}
                      </Button>
                      <Button
                        type="submit"
                        disabled={busy || deleting}
                        className="min-w-36 cursor-pointer disabled:cursor-not-allowed sm:w-auto"
                      >
                        {busy ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                            {C.saveWorking}
                          </span>
                        ) : (
                          C.saveChanges
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex w-full flex-col gap-2 sm:ml-auto sm:flex sm:w-auto sm:flex-row sm:justify-end sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full cursor-pointer sm:w-auto"
                    onClick={() => handleOpenChange(false)}
                  >
                    {C.cancel}
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      busy ||
                      deleting ||
                      categoriesLoading ||
                      !categories.length ||
                      !categoryId
                    }
                    className="w-full min-w-36 cursor-pointer disabled:cursor-not-allowed sm:w-auto"
                  >
                    {busy ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                        {C.submitWorking}
                      </span>
                    ) : scheduleMode === "instant" ? (
                      C.submitGoLive
                    ) : (
                      C.submitSchedule
                    )}
                  </Button>
                </div>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
