/**
 * Connection calls (DM audio/video).
 *
 * Layout:
 * - `api/`           React Query mutations (initiate, respond, cancel)
 * - `components/`    UI (header buttons, ring modals, global bridge)
 * - `constants.ts`   Ring timeout (keep in sync with server)
 * - `hooks/`         Actions, socket bridge, eligibility, abort
 * - `lib/`           Media intent, navigation, outgoing-call store
 * - `state/`         Missed-call inbox badges (Zustand)
 * - `types/`         Domain + socket payload parsers
 */

export {
  useCancelConnectionCall,
  useInitiateConnectionCall,
  useMarkConnectionCallMissed,
  useRespondConnectionCall,
} from './api';

export { ChatCallActions } from './components/chat-call-actions';
export { ConnectionCallBridge } from './components/connection-call-bridge';
export { IncomingConnectionCallDialog } from './components/incoming-connection-call-dialog';
export { OutgoingConnectionCallDialog } from './components/outgoing-connection-call-dialog';

export { useConnectionCallActions } from './hooks/use-connection-call-actions';
export { useConversationCallEligibility } from './hooks/use-conversation-call-eligibility';

export { canCallFromConversation } from './lib/call-eligibility';
export { CONNECTION_CALL_RING_TIMEOUT_MS } from './constants';
export {
  selectMissedCallCount,
  useConnectionCallStore,
} from './state/connection-call.store';

export type { ConnectionCallMode, IncomingConnectionCall, OutgoingConnectionCall } from './types/connection-call.types';
