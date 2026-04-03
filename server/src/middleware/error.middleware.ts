import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import logger from "@/core/logging";
import { CLIENT_SAFE_INTERNAL_MESSAGE } from "@/shared/messages";
import { ApiResponse } from "@/shared/responses";
import { AppError } from "@/shared/errors";
import type { Context } from "hono";

const isDev = process.env.NODE_ENV === "development";

const safeMessage = (message: string, statusCode: number) =>
    statusCode >= 500 && !isDev ? CLIENT_SAFE_INTERNAL_MESSAGE : message;

export const errorHandler = (err: Error, c: Context) => {
    logger.error("Error caught by global handler", err);

    if (err instanceof HTTPException) {
        const status = err.status;
        return c.json(
            ApiResponse.error({
                message: safeMessage(err.message, status),
                statusCode: status,
                code: "HTTP_EXCEPTION",
                stack: err.stack,
            }),
            status
        );
    }

    if (err instanceof AppError) {
        const status = err.statusCode;
        return c.json(
            ApiResponse.error({
                message: safeMessage(err.message, status),
                statusCode: status,
                code: err.code,
                errors: err.errors,
                stack: err.stack,
            }),
            status as any
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
            message: isDev ? (err.message || CLIENT_SAFE_INTERNAL_MESSAGE) : CLIENT_SAFE_INTERNAL_MESSAGE,
            statusCode: 500,
            code: "INTERNAL_ERROR",
            stack: err.stack,
        }),
        500
    );
};
