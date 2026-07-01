export type ConversationCueKind =
  | "shared_session_activity"
  | "shared_session_activity_detail"
  | "peer_session_activity"
  | "shared_interest"
  | "shared_mood"
  | "shared_looking_for"
  | "shared_goal"
  | "ai_generated";

export type ConversationCueDto = {
  id: string;
  kind: ConversationCueKind;
  priority: number;
  title: string;
  body: string | null;
  emoji: string | null;
};

export type ConversationCuesResponseDto = {
  cue: ConversationCueDto | null;
  hasMore: boolean;
};
