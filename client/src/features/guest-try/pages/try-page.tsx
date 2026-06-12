"use client";



import { useEffect, useMemo, useRef } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";



import { Button } from "@/components/ui/button";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ApiError } from "@/lib/api";

import { GUEST_TRIAL_FLOW } from "@/lib/copy/user-messages";

import { useSession } from "@/lib/auth-client";

import { warmDeviceFingerprint } from "@/lib/device-fingerprint";



import { TryBackButton } from "../components/try-back-button";

import { TryFlowStep } from "../components/try-flow-step";

import { TryLayout } from "../components/try-layout";

import {

  getTrySessionErrorMessage,

  isTrySignupRequiredError,

  useCreateTrySession,

} from "../hooks/use-create-try-session";

import { useTrySocket } from "../hooks/use-try-socket";

import { useGuestTryStatus } from "../hooks/use-guest-try-status";

import { useTryWizard } from "../hooks/use-try-wizard";

import { TRY_SIGNUP_ROUTE } from "../constants/try-routes";
import { markTryConsumedLocally } from "../lib/try-navigation";



function TryLoading({ message }: { message: string }) {

  return (

    <TryLayout>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">

        <div className="relative">

          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />

          <div className="absolute inset-0 flex items-center justify-center">

            <span className="text-xs font-bold text-primary">G</span>

          </div>

        </div>

        <p className="text-sm text-muted-foreground">{message}</p>

      </div>

    </TryLayout>

  );

}



export function TryPage() {

  const router = useRouter();

  const createAttemptedRef = useRef(false);

  const { data: session, isPending: sessionPending } = useSession();



  useTrySocket();



  useEffect(() => {

    warmDeviceFingerprint();

  }, []);



  const createGuest = useCreateTrySession();

  const hasAuthSession = Boolean(session?.user);

  const guestSessionReady = hasAuthSession || createGuest.isSuccess;

  const {

    data: status,

    isLoading: statusLoading,

    isFetching: statusFetching,

    error: statusError,

    refetch: refetchStatus,

  } = useGuestTryStatus({ enabled: !sessionPending && guestSessionReady });



  const wizard = useTryWizard(status);



  const needsGuestSession =

    !sessionPending &&

    !hasAuthSession &&

    !createGuest.isSuccess &&

    !createGuest.isPending;



  useEffect(() => {

    if (!needsGuestSession || createAttemptedRef.current) {

      return;

    }

    createAttemptedRef.current = true;

    createGuest.mutate(undefined, {

      onSuccess: () => {

        void refetchStatus();

      },

    });

  }, [needsGuestSession, createGuest, refetchStatus]);



  useEffect(() => {

    if (!status) {

      return;

    }

    if (!status.isGuest) {

      router.replace("/home");

      return;

    }

    if (status.trialConsumed) {

      markTryConsumedLocally();

    }

    if (status.trialConsumed) {
      router.replace(TRY_SIGNUP_ROUTE);
    }

  }, [status, router]);



  const bootLoading = useMemo(() => {

    if (sessionPending) {

      return true;

    }

    if (!guestSessionReady && (createGuest.isPending || !createGuest.isError)) {

      return true;

    }

    if (guestSessionReady && (statusLoading || statusFetching) && !status) {

      return true;

    }

    return false;

  }, [

    sessionPending,

    guestSessionReady,

    createGuest.isPending,

    createGuest.isError,

    statusLoading,

    statusFetching,

    status,

  ]);



  if (bootLoading) {

    const message = !guestSessionReady

      ? GUEST_TRIAL_FLOW.loading.boot

      : GUEST_TRIAL_FLOW.loading.status;

    return <TryLoading message={message} />;

  }



  if (createGuest.isError) {

    const message = getTrySessionErrorMessage(createGuest.error);

    const trialUsed = isTrySignupRequiredError(createGuest.error);

    return (

      <TryLayout>

        <Card className="max-w-2xl rounded-2xl border-destructive/25 shadow-lg">

          <CardHeader>

            <CardTitle>{GUEST_TRIAL_FLOW.errors.bootTitle}</CardTitle>

            <CardDescription>{message}</CardDescription>

          </CardHeader>

          <CardContent className="flex flex-col gap-2">

            {trialUsed ? (

              <Button asChild>

                <Link href={TRY_SIGNUP_ROUTE}>Create account & continue</Link>

              </Button>

            ) : (

              <Button

                type="button"

                onClick={() => {

                  createAttemptedRef.current = false;

                  createGuest.reset();

                  createGuest.mutate();

                }}

              >

                Try again

              </Button>

            )}

            <TryBackButton back={{ href: "/" }} />

          </CardContent>

        </Card>

      </TryLayout>

    );

  }



  if (statusError instanceof ApiError && (statusError.status === 401 || statusError.status === 403)) {

    return (

      <TryLayout>

        <Card className="max-w-2xl rounded-2xl shadow-lg">

          <CardHeader>

            <CardTitle>{GUEST_TRIAL_FLOW.errors.sessionTitle}</CardTitle>

            <CardDescription>{GUEST_TRIAL_FLOW.errors.sessionBody}</CardDescription>

          </CardHeader>

          <CardContent className="flex flex-col gap-2">

            <Button

              type="button"

              onClick={() => {

                createAttemptedRef.current = false;

                void refetchStatus();

                createGuest.mutate();

              }}

            >

              Start fresh

            </Button>

            <TryBackButton back={{ href: "/" }} />

          </CardContent>

        </Card>

      </TryLayout>

    );

  }



  if (!status?.isGuest) {

    return <TryLoading message={GUEST_TRIAL_FLOW.loading.redirect} />;

  }



  return (

    <TryLayout

      activeStep={wizard.activeStep}

      furthestStep={wizard.furthestStep}

      onStepSelect={wizard.goToStep}

    >

      <TryFlowStep

        activeStep={wizard.activeStep}

        displayName={status.displayName}

        trialConsumed={status.trialConsumed}
        canStartMatch={status.canStartMatch}
        matchSearchAttemptsRemaining={status.matchSearchAttemptsRemaining}
        back={wizard.back}

        vibeDraft={wizard.vibeDraft}

        onVibeDraftChange={wizard.setVibeDraft}

        onStepForward={wizard.goForward}

      />

    </TryLayout>

  );

}


