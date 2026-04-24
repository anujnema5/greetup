"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import {
  type ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

import { exchangeFirebaseSession } from "@/features/auth/lib/exchange-firebase-session";
import { digitsOnlyOtp } from "@/features/auth/utils/otp";
import { getFirebaseAuth } from "@/lib/firebase/client-app";

function disposeVerifier(verifierRef: MutableRefObject<RecaptchaVerifier | null>) {
  if (!verifierRef.current) return;
  try {
    verifierRef.current.clear();
  } catch {
    /* reCAPTCHA teardown is best-effort */
  }
  verifierRef.current = null;
}

/**
 * Firebase binds one invisible widget per DOM node; reusing the same id after resend throws
 * "reCAPTCHA has already been rendered in this element". Always mount a new child div per send.
 */
function newRecaptchaDomId(): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `firebase-recaptcha-${suffix}`;
}

function mountFreshRecaptchaContainer(host: HTMLDivElement): string {
  host.replaceChildren();
  const el = document.createElement("div");
  el.id = newRecaptchaDomId();
  host.appendChild(el);
  return el.id;
}

type FirebasePhoneAuthContextValue = {
  sendOtp: (e164Phone: string) => Promise<void>;
  confirmOtp: (code: string, options?: { displayName?: string }) => Promise<void>;
  isSending: boolean;
  reset: () => void;
};

const FirebasePhoneAuthContext = createContext<FirebasePhoneAuthContextValue | null>(null);

export function FirebasePhoneAuthProvider({ children }: { children: ReactNode }) {
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaHostRef = useRef<HTMLDivElement | null>(null);
  const [isSending, setIsSending] = useState(false);

  const reset = useCallback(() => {
    confirmationRef.current = null;
    disposeVerifier(verifierRef);
    recaptchaHostRef.current?.replaceChildren();
  }, []);

  const sendOtp = useCallback(
    async (e164Phone: string) => {
      const auth = getFirebaseAuth();
      const host = recaptchaHostRef.current;
      if (!host) {
        throw new Error("reCAPTCHA container not ready");
      }
      setIsSending(true);
      try {
        disposeVerifier(verifierRef);
        const containerId = mountFreshRecaptchaContainer(host);
        verifierRef.current = new RecaptchaVerifier(auth, containerId, {
          size: "invisible",
        });
        const confirmation = await signInWithPhoneNumber(auth, e164Phone, verifierRef.current);
        confirmationRef.current = confirmation;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const confirmOtp = useCallback(
    async (code: string, options?: { displayName?: string }) => {
      const confirmation = confirmationRef.current;
      if (!confirmation) {
        throw new Error("Request a code first");
      }
      const otp = digitsOnlyOtp(code);
      if (otp.length !== 6) {
        throw new Error("Enter the 6-digit code");
      }
      const cred = await confirmation.confirm(otp);
      const idToken = await cred.user.getIdToken();
      await exchangeFirebaseSession(idToken, options?.displayName);
      reset();
    },
    [reset]
  );

  return (
    <FirebasePhoneAuthContext.Provider value={{ sendOtp, confirmOtp, isSending, reset }}>
      <div ref={recaptchaHostRef} className="sr-only" aria-hidden />
      {children}
    </FirebasePhoneAuthContext.Provider>
  );
}

export function useFirebasePhoneAuth(): FirebasePhoneAuthContextValue {
  const ctx = useContext(FirebasePhoneAuthContext);
  if (!ctx) {
    throw new Error("useFirebasePhoneAuth must be used inside FirebasePhoneAuthProvider");
  }
  return ctx;
}
