"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiError, getApiErrorMessage } from "@/lib/api";
import { GUEST_TRIAL_NAME, GUEST_TRIAL_NAV } from "@/lib/copy/user-messages";

import { TryBackButton, type TryBackTarget } from "./try-back-button";
import { TryContinueButton } from "./try-continue-button";
import { TryStepActions } from "./try-step-actions";
import { TryStepFrame } from "./try-step-frame";
import { useSaveTryName } from "../hooks/use-save-try-name";
import { tryNameSchema, type TryNameInput } from "../schemas/try-name.schema";

type NameStepProps = {
  initialDisplayName?: string | null;
  back?: TryBackTarget;
  onForward?: () => void;
};

export function NameStep({ initialDisplayName, back, onForward }: NameStepProps) {
  const { mutateAsync, isPending } = useSaveTryName();
  const savedName = initialDisplayName?.trim() ?? "";

  const form = useForm<TryNameInput>({
    resolver: zodResolver(tryNameSchema),
    defaultValues: {
      displayName: savedName,
    },
    mode: "onSubmit",
  });

  const onSubmit = async (values: TryNameInput) => {
    form.clearErrors("root");
    const trimmed = values.displayName.trim();

    if (trimmed === savedName && savedName.length > 0) {
      onForward?.();
      return;
    }

    try {
      await mutateAsync(trimmed);
      onForward?.();
    } catch (error) {
      if (error instanceof ApiError) {
        try {
          const body = JSON.parse(error.body) as {
            errors?: Array<{ field: string; messages: string[] }>;
            message?: string;
          };
          const fieldError = body.errors?.find((item) => item.field === "displayName");
          const message =
            fieldError?.messages?.[0] ??
            (typeof body.message === "string" ? body.message : null);
          if (message) {
            form.setError("displayName", { type: "server", message });
            return;
          }
        } catch {
          /* fall through */
        }
      }
      form.setError("root", {
        type: "server",
        message: getApiErrorMessage(error, "Couldn't save your name. Try again?"),
      });
    }
  };

  const rootError =
    typeof form.formState.errors.root?.message === "string"
      ? form.formState.errors.root.message
      : undefined;

  const footer = (
    <TryStepActions
      primary={
        <TryContinueButton type="submit" form="guest-name-form" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {GUEST_TRIAL_NAME.saving}
            </>
          ) : (
            GUEST_TRIAL_NAV.continue
          )}
        </TryContinueButton>
      }
      secondary={back ? <TryBackButton back={back} /> : undefined}
    />
  );

  return (
    <TryStepFrame
      title={GUEST_TRIAL_NAME.title}
      description={GUEST_TRIAL_NAME.description}
      footer={footer}
      width="narrow"
    >
      <Form {...form}>
        <form id="guest-name-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="nickname"
                    placeholder={GUEST_TRIAL_NAME.fieldPlaceholder}
                    maxLength={30}
                    disabled={isPending}
                    className="h-10 rounded-lg bg-white/[0.03]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {rootError ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {rootError}
            </p>
          ) : null}
        </form>
      </Form>
    </TryStepFrame>
  );
}
