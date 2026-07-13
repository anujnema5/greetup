import { createAuthEndpoint } from "@better-auth/core/api";
import type { User } from "@better-auth/core/db";
import { APIError, BASE_ERROR_CODES } from "@better-auth/core/error";
import { setSessionCookie } from "better-auth/cookies";
import { parseUserOutput } from "better-auth/db";

import { createGuestSession } from "@/modules/guest";
import { createGuestSessionBodySchema } from "@/modules/guest/schemas/create-guest-session.schema";
import { resolveClientIp } from "@/modules/guest/lib/resolve-client-ip";
import {
  GuestRateLimitedError,
  GuestTrialAlreadyUsedError,
} from "@/shared/errors";

function mapGuestSessionError(error: unknown): never {
  if (error instanceof GuestTrialAlreadyUsedError) {
    throw APIError.from("FORBIDDEN", {
      code: "GUEST_TRIAL_ALREADY_USED",
      message: error.message,
    });
  }
  if (error instanceof GuestRateLimitedError) {
    throw APIError.from("TOO_MANY_REQUESTS", {
      code: "GUEST_RATE_LIMITED",
      message: error.message,
    });
  }
  if (error instanceof Error && error.message === "FAILED_TO_CREATE_GUEST_USER") {
    throw APIError.from("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.FAILED_TO_CREATE_USER);
  }
  if (error instanceof Error && error.message === "FAILED_TO_CREATE_GUEST_SESSION") {
    throw APIError.from("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION);
  }
  throw error;
}

/**
 * Issues a short-lived Better Auth session for the one-time guest call trial.
 * POST /api/auth/guest
 */
export function guestSessionPlugin() {
  return {
    id: "guest-session",
    endpoints: {
      createGuestSession: createAuthEndpoint(
        "/guest",
        {
          method: "POST",
          body: createGuestSessionBodySchema,
          metadata: {
            openapi: {
              description:
                "Create an ephemeral guest account and session for the one-time call trial",
            },
          },
        },
        async (ctx) => {
          try {
            const result = await createGuestSession(
              {
                deviceFingerprint: ctx.body.deviceFingerprint,
                ipAddress: ctx.request ? resolveClientIp(ctx.request) : null,
              },
              {
                createUser: async (input) => {
                  const created = await ctx.context.internalAdapter.createUser({
                    email: input.email,
                    name: input.name,
                    username: input.username,
                    emailVerified: input.emailVerified,
                  });
                  return created as User | null;
                },
                createSession: async (userId) => {
                  const session = await ctx.context.internalAdapter.createSession(userId);
                  if (!session) return null;
                  return {
                    id: session.id,
                    token: session.token,
                    userId: session.userId,
                    expiresAt: session.expiresAt,
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt,
                    ipAddress: session.ipAddress,
                    userAgent: session.userAgent,
                  };
                },
              },
            );

            await setSessionCookie(ctx, {
              session: result.session,
              user: result.user as User,
            });

            return ctx.json({
              userId: result.userId,
              isGuest: result.isGuest,
              callTrialConsumed: result.callTrialConsumed,
              user: parseUserOutput(ctx.context.options, result.user as User),
            });
          } catch (error) {
            mapGuestSessionError(error);
          }
        },
      ),
    },
  };
}
