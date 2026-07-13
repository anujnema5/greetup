'use client';

import { useEffect } from 'react';
import {
  startConnectionCallRingtone,
  stopConnectionCallRingtone,
} from '../lib/connection-call-ringtone';

/** Plays a soft repeating tone while `active` is true (incoming or outgoing ring). */
export function useConnectionCallRingtone(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    startConnectionCallRingtone();
    return () => {
      stopConnectionCallRingtone();
    };
  }, [active]);
}
