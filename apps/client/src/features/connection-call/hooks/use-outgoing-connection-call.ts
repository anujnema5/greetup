'use client';

import { useEffect, useState } from 'react';
import { getOutgoingCall, subscribeOutgoingCall } from '../lib/outgoing-call-store';
import type { OutgoingConnectionCall } from '../types/connection-call.types';

/** Active outgoing ring (caller waiting for peer). */
export function useOutgoingConnectionCall(): OutgoingConnectionCall | null {
  const [outgoing, setOutgoing] = useState<OutgoingConnectionCall | null>(() => getOutgoingCall());

  useEffect(() => subscribeOutgoingCall(setOutgoing), []);

  return outgoing?.status === 'ringing' ? outgoing : null;
}
