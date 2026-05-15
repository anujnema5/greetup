export type CreateCircleErrorCode =
  | "CATEGORY_NOT_FOUND"
  | "INVALID_SCHEDULE"
  | "INVALID_INVITEES"
  | "INVITEE_RESTRICTED_ROOM_INVITES"
  | "INVITES_EXCEED_CAPACITY";

export class CreateCircleError extends Error {
  constructor(
    message: string,
    public readonly code: CreateCircleErrorCode,
  ) {
    super(message);
    this.name = "CreateCircleError";
  }
}
