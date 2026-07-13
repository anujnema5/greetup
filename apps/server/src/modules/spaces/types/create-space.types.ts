export type CreateSpaceErrorCode =
  | "CATEGORY_NOT_FOUND"
  | "INVALID_SCHEDULE"
  | "INVALID_INVITEES"
  | "INVITEE_RESTRICTED_ROOM_INVITES"
  | "INVITES_EXCEED_CAPACITY";

export class CreateSpaceError extends Error {
  constructor(
    message: string,
    public readonly code: CreateSpaceErrorCode,
  ) {
    super(message);
    this.name = "CreateSpaceError";
  }
}
