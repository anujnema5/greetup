"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { startCall, minimizeCall } from "@/lib/redux/slices/callSlice";
import {
  isCallSessionMarkedActive,
  isCallMinimizedMarked,
} from "@/lib/call/call-sync";

/** Restores Redux minimized-call state after refresh when session markers are set. */
export function CallMinimizedHydration() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (isCallSessionMarkedActive() && isCallMinimizedMarked()) {
      dispatch(startCall());
      dispatch(minimizeCall());
    }
  }, [dispatch]);

  return null;
}
