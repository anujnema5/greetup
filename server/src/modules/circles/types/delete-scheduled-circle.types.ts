export type DeleteScheduledCircleErrorCode = "ROOM_NOT_FOUND";

export class DeleteScheduledCircleError extends Error {
  constructor(
    message: string,
    public readonly code: DeleteScheduledCircleErrorCode,
    public readonly statusCode: 404,
  ) {
    super(message);
    this.name = "DeleteScheduledCircleError";
  }
}
