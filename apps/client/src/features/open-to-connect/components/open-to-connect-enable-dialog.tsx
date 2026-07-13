"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  OptionChipList,
  SessionActivitiesBlock,
} from "@/features/matching/components/match-prep-dialog-parts";
import {
  deriveInitialFormState,
  dialogSectionPxClass,
  dialogShellClass,
  scrollBodyClass,
  toggleIdInArray,
} from "@/features/matching/utils/match-prep-dialog.utils";
import { buildActivitySelectionsPayload } from "@/features/matching/utils/session-activities.utils";
import {
  useMatchPrepCurrent,
  useMatchPrepOptions,
  useSaveMatchPrep,
} from "@/features/profile-setup/api";
import { OPEN_TO_CONNECT } from "@/lib/copy/user-messages";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { cn } from "@/lib/utils";

import { useEnableOpenToConnect } from "../api/open-to-connect.mutations";
import { useOpenToConnectMe } from "../api/open-to-connect.queries";
import {
  createOpenToConnectEnableSchema,
  type OpenToConnectEnableFormValues,
} from "../schemas/open-to-connect-enable.schema";

const EMPTY_OTC_FORM_VALUES: OpenToConnectEnableFormValues = {
  headline: "",
  lookingForIds: [],
  activityIds: [],
  activityDetails: {},
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OpenToConnectEnableDialog({ open, onOpenChange }: Props) {
  const { data: me } = useOpenToConnectMe(open);
  const { data: options, isLoading: optionsLoading, isError: optionsError, refetch } =
    useMatchPrepOptions({ enabled: open });
  const {
    data: saved,
    isSuccess: savedReady,
    isError: savedError,
  } = useMatchPrepCurrent({ enabled: open });
  const saveMatchPrep = useSaveMatchPrep();
  const enable = useEnableOpenToConnect();

  const seededRef = useRef(false);
  const formScrollRef = useRef<HTMLDivElement>(null);

  const activityRows = options?.activities ?? [];
  const prefsLoading = optionsLoading || (open && !savedReady && !savedError);
  const busy = saveMatchPrep.isPending || enable.isPending;

  const schema = useMemo(
    () => createOpenToConnectEnableSchema(activityRows),
    [activityRows],
  );

  const form = useForm<OpenToConnectEnableFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_OTC_FORM_VALUES,
    mode: "onSubmit",
  });

  const resetDialogUiState = useCallback(() => {
    seededRef.current = false;
    form.clearErrors();
    form.reset(EMPTY_OTC_FORM_VALUES);
  }, [form]);

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) resetDialogUiState();
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetDialogUiState],
  );

  useEffect(() => {
    if (!open || !options || seededRef.current) return;
    if (!savedReady && !savedError) return;

    seededRef.current = true;
    const next = deriveInitialFormState(options, saved);
    form.reset({
      headline: me?.headline ?? "",
      lookingForIds: [...next.lookingFor],
      activityIds: [...next.selectedActivityIds],
      activityDetails: next.activityDetails,
    });
  }, [open, options, saved, savedReady, savedError, me?.headline, form]);

  const onSubmit = async (values: OpenToConnectEnableFormValues) => {
    form.clearErrors("root");

    const interestIds = saved?.interestIds ?? [];
    if (interestIds.length === 0) {
      form.setError("root", {
        type: "manual",
        message: "Add interests in your profile or match preferences first.",
      });
      return;
    }

    const moodIds =
      saved && saved.moodIds.length > 0
        ? saved.moodIds
        : options?.moods[0]?.id
          ? [options.moods[0].id]
          : [];
    if (moodIds.length === 0) {
      form.setError("root", {
        type: "manual",
        message: "Could not load mood options. Try again.",
      });
      return;
    }

    const activitySelections = buildActivitySelectionsPayload(
      new Set(values.activityIds),
      values.activityDetails,
    );
    const matchIntent = saved?.matchIntent ?? "quick";

    try {
      await saveMatchPrep.mutateAsync({
        matchIntent,
        activitySelections,
        moodIds,
        lookingForIds: values.lookingForIds,
        interestIds,
        connectionPreference: saved?.connectionPreference ?? "open_to_anyone",
        locationPreferenceEnabled: saved?.locationPreferenceEnabled ?? false,
        distancePreference: saved?.distancePreference ?? "random",
        location:
          saved?.location?.country &&
          saved.location.countryCode &&
          typeof saved.location.latitude === "number" &&
          typeof saved.location.longitude === "number"
            ? {
                country: saved.location.country,
                countryCode: saved.location.countryCode,
                region: saved.location.region ?? undefined,
                regionCode: saved.location.regionCode ?? undefined,
                city: saved.location.city ?? undefined,
                latitude: saved.location.latitude,
                longitude: saved.location.longitude,
              }
            : undefined,
        sessionGoal: null,
      });

      await enable.mutateAsync({
        headline: values.headline.trim() || null,
      });
      handleDialogOpenChange(false);
    } catch (err: unknown) {
      form.setError("root", {
        type: "server",
        message: getApiErrorMessage(err, OPEN_TO_CONNECT.toast.enableFailed),
      });
    }
  };

  const rootError =
    typeof form.formState.errors.root?.message === "string"
      ? form.formState.errors.root.message
      : undefined;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className={dialogShellClass}>
        <div className={cn("shrink-0 border-b border-border py-4 pl-5 pr-10 sm:pl-6 sm:pr-12")}>
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>{OPEN_TO_CONNECT.enable.dialogTitle}</DialogTitle>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                {OPEN_TO_CONNECT.enable.recommendedBadge}
              </span>
            </div>
            <DialogDescription>{OPEN_TO_CONNECT.enable.dialogDescription}</DialogDescription>
          </DialogHeader>
        </div>

        <div ref={formScrollRef} className={cn(scrollBodyClass, "pb-5 sm:pb-6")}>
          {prefsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : optionsError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Could not load options.{" "}
              <button
                type="button"
                className="font-medium underline underline-offset-2"
                onClick={() => void refetch()}
              >
                Retry
              </button>
            </div>
          ) : options ? (
            <Form {...form}>
              <form
                id="otc-enable-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 pt-4"
              >
                <FormField
                  control={form.control}
                  name="headline"
                  render={({ field }) => (
                    <FormItem className="gap-2.5">
                      <FormLabel className="text-muted-foreground">
                        {OPEN_TO_CONNECT.enable.headlineLabel}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          maxLength={120}
                          placeholder={OPEN_TO_CONNECT.enable.headlinePlaceholder}
                          className="h-10 rounded-xl"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {activityRows.length > 0 ? (
                  <FormField
                    control={form.control}
                    name="activityIds"
                    render={({ field }) => (
                      <FormItem className="gap-2.5">
                        <FormControl>
                          <SessionActivitiesBlock
                            rows={activityRows}
                            selectedIds={new Set(field.value)}
                            activityDetails={form.watch("activityDetails")}
                            onToggle={(id) => {
                              const next = toggleIdInArray(id, field.value, 3);
                              field.onChange(next);
                              if (!next.includes(id)) {
                                const details = { ...form.getValues("activityDetails") };
                                delete details[id];
                                form.setValue("activityDetails", details, { shouldDirty: true });
                              }
                            }}
                            onDetailChange={(id, value) =>
                              form.setValue(
                                "activityDetails",
                                { ...form.getValues("activityDetails"), [id]: value },
                                { shouldDirty: true },
                              )
                            }
                            required={false}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                <FormField
                  control={form.control}
                  name="lookingForIds"
                  render={({ field }) => (
                    <FormItem className="gap-2.5">
                      <FormLabel className="text-muted-foreground">Looking for</FormLabel>
                      <FormControl>
                        <OptionChipList
                          rows={options.lookingFor}
                          selectedIds={field.value}
                          onToggle={(id) => field.onChange(toggleIdInArray(id, field.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {rootError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {rootError}
                  </p>
                ) : null}
              </form>
            </Form>
          ) : null}
        </div>

        <DialogFooter
          className={cn(
            "shrink-0 gap-2 border-t border-border bg-card/90 py-4",
            dialogSectionPxClass,
          )}
        >
          <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="otc-enable-form"
            disabled={busy || prefsLoading || !options}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {OPEN_TO_CONNECT.enable.enabling}
              </>
            ) : (
              OPEN_TO_CONNECT.enable.enable
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
