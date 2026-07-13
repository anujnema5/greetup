/** Stable session shapes for call UI and integrations. */

export type CallSessionRole = "host" | "participant";

export type CallSessionKind = "direct_match" | "db_space";

export type CallSessionSummary = {
  roomId: string;
  kind: CallSessionKind;
  role: CallSessionRole;
  title: string | null;
};
