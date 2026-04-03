export type CreateCircleErrorCode =
  | "CATEGORY_NOT_FOUND"
  | "INVALID_SCHEDULE"
  | "INVALID_INVITEES";

export class CreateCircleError extends Error {
  constructor(
    message: string,
    public readonly code: CreateCircleErrorCode,
  ) {
    super(message);
    this.name = "CreateCircleError";
  }
}
