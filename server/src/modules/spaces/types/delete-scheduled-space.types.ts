export type DeleteScheduledSpaceErrorCode = "ROOM_NOT_FOUND";

export class DeleteScheduledSpaceError extends Error {
  constructor(
    message: string,
    public readonly code: DeleteScheduledSpaceErrorCode,
    public readonly statusCode: 404,
  ) {
    super(message);
    this.name = "DeleteScheduledSpaceError";
  }
}
