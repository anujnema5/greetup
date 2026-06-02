/** Product session discriminator — same strings in Postgres `session_kind` and Redis/API `sessionKind`. */
export type SessionKind = "match" | "connection_call" | "circle";

export const SESSION_KINDS = ["match", "connection_call", "circle"] as const satisfies readonly SessionKind[];

export function isSessionKind(value: unknown): value is SessionKind {
  return typeof value === "string" && (SESSION_KINDS as readonly string[]).includes(value);
}
