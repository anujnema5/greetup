export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "EMAIL_NOT_VERIFIED"
  | "PREMIUM_REQUIRED"
  | "PREMIUM_EXPIRED"
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
