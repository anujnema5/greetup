'use client'

import { createContext, useContext, useState } from "react";

type CallState = "idle" | "connected";

interface CallContextValue {
  callState: CallState;
  setCallState: (s: CallState) => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [callState, setCallState] = useState<CallState>("idle");
  return (
    <CallContext.Provider value={{ callState, setCallState }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside CallProvider");
  return ctx;
}
