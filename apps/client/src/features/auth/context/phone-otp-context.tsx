"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

import {
  startPhoneOtp,
  startPhoneOtpUpdate,
  verifyPhoneOtp,
  verifyPhoneOtpUpdate,
} from "@/features/auth/lib/phone-otp";

/**
 * `signin` — sign-in / sign-up (issues a session). `update` — a signed-in user changing their
 * number in Settings (verifies against the existing session). The mode selects which server
 * endpoints the same UI talks to.
 */
export type PhoneOtpMode = "signin" | "update";

type PhoneOtpContextValue = {
  /** Send an SMS code to the given E.164 number. */
  sendOtp: (e164Phone: string) => Promise<void>;
  /** Verify the code. `signin` establishes a session; `update` sets the new number. */
  confirmOtp: (
    e164Phone: string,
    code: string,
    options?: { displayName?: string },
  ) => Promise<void>;
  isSending: boolean;
  /** Kept for API compatibility with the old Firebase context; no client state to tear down. */
  reset: () => void;
};

const PhoneOtpContext = createContext<PhoneOtpContextValue | null>(null);

export function PhoneOtpProvider({
  children,
  mode = "signin",
}: {
  children: ReactNode;
  mode?: PhoneOtpMode;
}) {
  const [isSending, setIsSending] = useState(false);

  const sendOtp = useCallback(
    async (e164Phone: string) => {
      setIsSending(true);
      try {
        if (mode === "update") {
          await startPhoneOtpUpdate(e164Phone);
        } else {
          await startPhoneOtp(e164Phone);
        }
      } finally {
        setIsSending(false);
      }
    },
    [mode],
  );

  const confirmOtp = useCallback(
    async (e164Phone: string, code: string, options?: { displayName?: string }) => {
      if (mode === "update") {
        await verifyPhoneOtpUpdate(e164Phone, code);
      } else {
        await verifyPhoneOtp(e164Phone, code, options?.displayName);
      }
    },
    [mode],
  );

  const reset = useCallback(() => {
    /* no-op: server-side OTP keeps no client session/verifier state */
  }, []);

  return (
    <PhoneOtpContext.Provider value={{ sendOtp, confirmOtp, isSending, reset }}>
      {children}
    </PhoneOtpContext.Provider>
  );
}

export function usePhoneOtp(): PhoneOtpContextValue {
  const ctx = useContext(PhoneOtpContext);
  if (!ctx) {
    throw new Error("usePhoneOtp must be used inside PhoneOtpProvider");
  }
  return ctx;
}
