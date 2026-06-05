/**
 * Connection calls (DM audio/video).
 *
 * Layout:
 * - `api/`           RTK mutations (initiate, respond, cancel)
 * - `components/`    UI (header buttons, ring modals, global bridge)
 * - `constants.ts`   Ring timeout (keep in sync with server)
 * - `hooks/`         Actions, socket bridge, eligibility, abort
 * - `lib/`           Media intent, navigation, outgoing-call store
 * - `slices/`        Missed-call inbox badges (Redux)
 * - `types/`         Domain + socket payload parsers
 */

export { connectionCallApi, useInitiateConnectionCallMutation, useRespondConnectionCallMutation, useCancelConnectionCallMutation, useMarkConnectionCallMissedMutation } from './api/connection-call-api';

export { ChatCallActions } from './components/chat-call-actions';
export { ConnectionCallBridge } from './components/connection-call-bridge';
export { IncomingConnectionCallDialog } from './components/incoming-connection-call-dialog';
export { OutgoingConnectionCallDialog } from './components/outgoing-connection-call-dialog';

export { useConnectionCallActions } from './hooks/use-connection-call-actions';
export { useConversationCallEligibility } from './hooks/use-conversation-call-eligibility';

export { canCallFromConversation } from './lib/call-eligibility';
export { CONNECTION_CALL_RING_TIMEOUT_MS } from './constants';
export {
  missedConnectionCallMarked,
  missedConnectionCallCleared,
  selectMissedCallCount,
} from './slices/connection-call.slice';

export type { ConnectionCallMode, IncomingConnectionCall, OutgoingConnectionCall } from './types/connection-call.types';
