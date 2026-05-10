"use client";

import { format, startOfDay } from "date-fns";
import { CalendarIcon, ChevronDown, Loader2, Lock, Globe2 } from "lucide-react";
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
import { START_CIRCLE_COPY as C } from "@/features/circles/constants/start-circle-copy";
import type { StartCircleModalState } from "@/features/circles/hooks/use-start-circle-modal-state";

export type StartCircleModalDialogProps = Omit<
  StartCircleModalState,
  "shell" | "inviteDialogOpen" | "handleInviteConfirm"
>;

export function StartCircleModalDialog(props: StartCircleModalDialogProps) {
  const {
    open,
    handleOpenChange,
    form,
    submitCreateCircle,
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
    setInviteDialogOpen,
    setOpen,
  } = props;

  const scheduleMode = useWatch({
    control: form.control,
    name: "scheduleMode",
  });
  const categoryId = useWatch({ control: form.control, name: "categoryId" });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "flex max-h-[min(90dvh,760px)] flex-col gap-0 overflow-y-auto p-6 sm:p-8",
          "border-border/60 bg-card shadow-2xl sm:max-w-2xl",
          "rounded-2xl",
        )}
      >
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
            {C.modalTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground sm:text-[15px] sm:leading-relaxed">
            {C.modalDescription}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submitCreateCircle)}
            className="mt-4 flex flex-col gap-5 sm:gap-6"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
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
                        <p className="text-sm font-medium">{C.categoryLabel}</p>
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
                            className="text-sm font-medium"
                          >
                            {C.seatsLabel}
                          </FormLabel>
                          <FormControl>
                            <Input
                              id="max-p"
                              type="number"
                              min={2}
                              max={100}
                              className="h-11 w-full max-w-full border-border/80 bg-background/50 transition-[border-color,box-shadow] sm:max-w-36"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  Math.min(
                                    100,
                                    Math.max(2, Number(e.target.value) || 2),
                                  ),
                                )
                              }
                              value={field.value}
                            />
                          </FormControl>
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">
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
                  <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-end sm:gap-4">
                    <FormField
                      control={form.control}
                      name="scheduleDate"
                      render={({ field }) => (
                        <FormItem className="min-w-0 flex-1 space-y-1">
                          <FormLabel className="text-xs font-medium leading-none text-muted-foreground">
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
                            htmlFor="circle-schedule-time"
                            className="text-xs font-medium leading-none text-muted-foreground"
                          >
                            {C.scheduleTimeLabel}
                          </FormLabel>
                          <FormControl>
                            <Input
                              id="circle-schedule-time"
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
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-muted-foreground">
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
                            ? C.inviteSubtitleCount(invitedPeerIds.size)
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
                      className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
                              <FormLabel className="text-base font-medium">
                                Host starts meeting
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Lobby until you start the call.
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
                      <FormField
                        control={form.control}
                        name="advanced.shouldMeetingAutoStart"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 border-b border-border/40 bg-background/30 px-4 py-3.5">
                            <div className="min-w-0 space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                Auto-start at scheduled time
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Open the room without a host click.
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
                      <FormField
                        control={form.control}
                        name="advanced.circleExpirationMinutes"
                        render={({ field }) => (
                          <FormItem className="space-y-2 border-b border-border/40 bg-background/30 px-4 py-3.5">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                Cancel if not started (minutes)
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Optional cap for scheduled circles.
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
                      <FormField
                        control={form.control}
                        name="advanced.deleteCircleAfterCall"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 border-b border-border/40 bg-background/30 px-4 py-3.5">
                            <div className="min-w-0 space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                Delete after call
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Remove this circle when it ends.
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
                      <FormField
                        control={form.control}
                        name="advanced.hostControlsActiveSpeaker"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 bg-background/30 px-4 py-3.5">
                            <div className="min-w-0 space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                Host picks speaker
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Only you can spotlight.
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

            <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full cursor-pointer sm:w-auto"
                onClick={() => setOpen(false)}
              >
                {C.cancel}
              </Button>
              <Button
                type="submit"
                disabled={
                  creating ||
                  categoriesLoading ||
                  !categories.length ||
                  !categoryId
                }
                className="w-full min-w-36 cursor-pointer disabled:cursor-not-allowed sm:w-auto"
              >
                {creating ? (
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
