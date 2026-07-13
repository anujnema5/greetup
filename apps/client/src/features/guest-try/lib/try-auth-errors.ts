import { ApiError } from "@/lib/api";

export function isTryAuthStatusError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}
