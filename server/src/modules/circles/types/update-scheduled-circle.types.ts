export type UpdateScheduledCircleErrorCode =
  | "ROOM_NOT_FOUND"
  | "INVALID_SCHEDULE"
  | "INVALID_END";

export class UpdateScheduledCircleError extends Error {
  constructor(
    message: string,
    public readonly code: UpdateScheduledCircleErrorCode,
    public readonly statusCode: 400 | 404,
  ) {
    super(message);
    this.name = "UpdateScheduledCircleError";
  }
}
