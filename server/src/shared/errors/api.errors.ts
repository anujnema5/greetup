export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "EMAIL_NOT_VERIFIED"
  | "PREMIUM_REQUIRED"
  | "PREMIUM_EXPIRED"
  | "GUEST_TRIAL_EXHAUSTED"
  | "GUEST_TRIAL_ALREADY_USED"
  | "GUEST_RATE_LIMITED"
  | "GUEST_NOT_ALLOWED"
  | "GUEST_PROFILE_INCOMPLETE"
  | "GUEST_SEARCH_RETRY_EXHAUSTED"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export class AppError extends Error {
  statusCode: number;
  code: ErrorCode;
  isOperational: boolean;
  errors?: any[];

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    errors?: any[]
  ) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors?: any[]) {
    super(message, 400, "VALIDATION_ERROR", errors);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(message: string = "Email verification required") {
    super(message, 403, "EMAIL_NOT_VERIFIED");
  }
}

export class PremiumSubscriptionRequiredError extends AppError {
  constructor(message: string = "Premium subscription required") {
    super(message, 403, "PREMIUM_REQUIRED");
  }
}

export class PremiumSubscriptionExpiredError extends AppError {
  constructor(message: string = "Premium subscription expired") {
    super(message, 403, "PREMIUM_EXPIRED") 
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict") {
    super(message, 409, "CONFLICT");
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = "Service temporarily unavailable") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}

export class GuestTrialExhaustedError extends AppError {
  constructor(message: string = "You've already had your try. Sign up or log in to keep matching.") {
    super(message, 403, "GUEST_TRIAL_EXHAUSTED");
  }
}

export class GuestTrialAlreadyUsedError extends AppError {
  constructor(message: string = "This device already had a try. Sign up or log in to continue.") {
    super(message, 403, "GUEST_TRIAL_ALREADY_USED");
  }
}

export class GuestRateLimitedError extends AppError {
  constructor(message: string = "Too many attempts from this network. Try again later or sign up.") {
    super(message, 429, "GUEST_RATE_LIMITED");
  }
}

export class GuestNotAllowedError extends AppError {
  constructor(message: string = "Sign up or log in to use that feature.") {
    super(message, 403, "GUEST_NOT_ALLOWED");
  }
}

export class GuestProfileIncompleteError extends AppError {
  constructor(
    message: string = "Complete your name and matching preferences before searching.",
  ) {
    super(message, 400, "GUEST_PROFILE_INCOMPLETE");
  }
}

export class GuestSearchRetryExhaustedError extends AppError {
  constructor(
    message: string = "You've reached the search limit for now. Sign up or log in to keep matching.",
  ) {
    super(message, 403, "GUEST_SEARCH_RETRY_EXHAUSTED");
  }
}
