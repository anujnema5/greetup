export class ActivitySelectionValidationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "ACTIVITY_REQUIRED"
      | "ACTIVITY_INVALID"
      | "ACTIVITY_DUPLICATE"
      | "ACTIVITY_DETAIL_REQUIRED"
      | "ACTIVITY_DETAIL_TOO_LONG"
      | "ACTIVITY_NOT_ALLOWED",
  ) {
    super(message);
    this.name = "ActivitySelectionValidationError";
  }
}
