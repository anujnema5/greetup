import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import logger from "@/core/logging";
import { ApiResponse } from "@/shared/responses";
import { AppError } from "@/shared/errors";
import type { Context } from "hono";

export const errorHandler = (err: Error, c: Context) => {
    logger.error("Error caught by global handler", err);

    if (err instanceof HTTPException) {
        return c.json(
            ApiResponse.error({
                message: err.message,
                statusCode: err.status,
                code: "HTTP_EXCEPTION",
                stack: err.stack,
            }),
            err.status
        );
    }

    if (err instanceof AppError) {
        return c.json(
            ApiResponse.error({
                message: err.message,
                statusCode: err.statusCode,
                code: err.code,
                errors: err.errors,
                stack: err.stack,
            }),
            err.statusCode as any
        );
    }

    if (err instanceof ZodError) {
        const validationErrors = err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));

        return c.json( 
            ApiResponse.error({
                message: "Validation failed",
                statusCode: 400,
                code: "VALIDATION_ERROR",
                errors: validationErrors,
            }),
            400
        );
    }

    if (err.name === "JsonWebTokenError") {
        return c.json(
            ApiResponse.error({
                message: "Invalid token",
                statusCode: 401,
                code: "INVALID_TOKEN",
            }),
            401
        );
    }

    if (err.name === "TokenExpiredError") {
        return c.json(
            ApiResponse.error({
                message: "Token expired",
                statusCode: 401,
                code: "TOKEN_EXPIRED",
            }),
            401
        );
    }

    if (err.name === "MulterError") {
        const multerError = err as any;

        if (multerError.code === "LIMIT_FILE_SIZE") {
            return c.json(
                ApiResponse.error({
                    message: "File too large",
                    statusCode: 400,
                    code: "FILE_TOO_LARGE",
                    errors: [{ field: "file", message: "File size exceeds limit" }],
                }),
                400
            );
        }

        if (multerError.code === "LIMIT_FILE_COUNT") {
            return c.json(
                ApiResponse.error({
                    message: "Too many files",
                    statusCode: 400,
                    code: "FILE_COUNT_EXCEEDED",
                    errors: [{ field: "files", message: "File count exceeds limit" }],
                }),
                400
            );
        }
    }

    if (err.name === "RateLimitError") {
        return c.json(
            ApiResponse.error({
                message: "Too many requests",
                statusCode: 429,
                code: "RATE_LIMIT_EXCEEDED",
            }),
            429
        );
    }

    logger.error("Unhandled error", err);

    return c.json(
        ApiResponse.error({
            message:
                process.env.NODE_ENV === "production"
                    ? "Internal server error"
                    : err.message,
            statusCode: 500,
            code: "INTERNAL_ERROR",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        }),
        500
    );
};
