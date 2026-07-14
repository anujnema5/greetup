import { createAuthEndpoint } from "@better-auth/core/api";
import type { User } from "@better-auth/core/db";
import { APIError, BASE_ERROR_CODES } from "@better-auth/core/error";
import { generateRandomString } from "better-auth/crypto";
import { setSessionCookie } from "better-auth/cookies";
import { parseUserOutput } from "better-auth/db";
import { sessionMiddleware } from "better-auth/api";
import * as z from "zod";

import { checkOtpSendAllowed, createOtp, normalizeE164, verifyOtp } from "@/core/auth/otp";
import type { VerifyOtpResult } from "@/core/auth/otp";
import logger from "@/core/logging";
import { isSnsConfigured, sendOtpSms, SmsDeliveryError } from "@/core/sns";
import { detectGuestSignupOnRegister } from "@/modules/guest";
import type { GuestSignupAuthPluginContext } from "@/modules/guest/lib/guest-signup-auth-context";
import { resolveClientIp } from "@/modules/guest/lib/resolve-client-ip";
import config from "@/shared/config/config";

const startBodySchema = z.object({
  phone: z.string().min(1),
});

const verifyBodySchema = z.object({
  phone: z.string().min(1),
  code: z.string().min(1),
  /** Optional display name when signing up from the phone registration flow. */
  name: z.string().min(1).max(100).optional(),
});

const updateVerifyBodySchema = z.object({
  phone: z.string().min(1),
  code: z.string().min(1),
});

function syntheticEmailForPhone(): string {
  return `phone_${generateRandomString(20)}@phone.greetup.local`;
}

/** Normalize + validate an inbound phone number, or throw a 400 the client can show. */
function requireE164(rawPhone: string): string {
  const phone = normalizeE164(rawPhone);
  if (!phone) {
    throw APIError.from("BAD_REQUEST", {
      code: "INVALID_PHONE_NUMBER",
      message: "Enter a valid phone number in international format (e.g. +14155550100).",
    });
  }
  return phone;
}

/**
 * Build the `OTP_SEND_FAILED` error. Production returns a generic user-facing message;
 * development includes the exact cause (missing creds, AWS rejection) so setup issues are
 * obvious in the response — full detail is always written to the server logs regardless.
 */
function otpSendFailed(detail: string): APIError {
  return APIError.from("INTERNAL_SERVER_ERROR", {
    code: "OTP_SEND_FAILED",
    message:
      config.env === "production"
        ? "Could not send the verification code. Please try again."
        : `Could not send the verification code — ${detail}`,
  });
}

/** Rate-limit, generate and SMS a fresh code. Shared by sign-in and phone-update start. */
async function startPhoneOtp(request: Request | undefined, rawPhone: string): Promise<void> {
  const phone = requireE164(rawPhone);

  // Fail fast (before touching Redis / SNS) when AWS is not wired up, so a misconfigured
  // environment surfaces the real reason in dev instead of a downstream generic error.
  if (!isSnsConfigured()) {
    logger.error(
      "Phone OTP requested but AWS SNS is not configured (need AWS_SNS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)",
    );
    throw otpSendFailed(
      "SMS is not configured on the server (set AWS_SNS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY).",
    );
  }

  const ip = (request ? resolveClientIp(request) : null) ?? "unknown";

  const gate = await checkOtpSendAllowed(phone, ip);
  if (!gate.allowed) {
    throw APIError.from("TOO_MANY_REQUESTS", {
      code: "OTP_RATE_LIMITED",
      message:
        gate.reason === "cooldown"
          ? "Please wait before requesting another code."
          : "Too many code requests. Try again later.",
    });
  }

  const code = await createOtp(phone);
  try {
    await sendOtpSms(phone, code);
  } catch (err) {
    if (err instanceof SmsDeliveryError) {
      const detail = err.cause instanceof Error ? err.cause.message : err.message;
      throw otpSendFailed(detail);
    }
    throw err;
  }
}

/** Verify a code or throw a 400/429 with a generic message (detail is logged server-side). */
function assertOtpVerified(result: VerifyOtpResult, phone: string): void {
  if (result.status === "ok") return;
  if (result.status === "too_many_attempts") {
    logger.warn("Phone OTP locked after too many attempts", { phone });
    throw APIError.from("TOO_MANY_REQUESTS", {
      code: "OTP_TOO_MANY_ATTEMPTS",
      message: "Too many incorrect attempts. Request a new code.",
    });
  }
  // not_found (expired / never issued) and mismatch both read as a generic invalid code.
  throw APIError.from("BAD_REQUEST", {
    code: "OTP_INVALID",
    message: "That code is invalid or has expired.",
  });
}

/**
 * Server-side phone OTP over AWS SNS. Replaces the Firebase client token exchange:
 * `/start` sends a code, `/verify` checks it and issues a Better Auth session.
 */
export function phoneOtpPlugin() {
  return {
    id: "phone-otp",
    endpoints: {
      phoneOtpStart: createAuthEndpoint(
        "/phone-otp/start",
        {
          method: "POST",
          body: startBodySchema,
          metadata: {
            openapi: { description: "Send a phone OTP for sign-in / sign-up via AWS SNS." },
          },
        },
        async (ctx) => {
          await startPhoneOtp(ctx.request, ctx.body.phone);
          return ctx.json({ ok: true });
        },
      ),

      phoneOtpVerify: createAuthEndpoint(
        "/phone-otp/verify",
        {
          method: "POST",
          body: verifyBodySchema,
          metadata: {
            openapi: { description: "Verify a phone OTP and issue a Better Auth session." },
          },
        },
        async (ctx) => {
          const phone = requireE164(ctx.body.phone);
          assertOtpVerified(await verifyOtp(phone, ctx.body.code), phone);

          let user = (await ctx.context.adapter.findOne({
            model: "user",
            where: [{ field: "phoneNumber", value: phone }],
          })) as User | null;

          if (!user) {
            await detectGuestSignupOnRegister({
              headers: ctx.request?.headers,
              provider: "phone",
              authPluginContext: ctx.context as GuestSignupAuthPluginContext,
              metadata: { hook: "phone-otp.signup" },
            });

            const handle = `u_${generateRandomString(12)}`;
            const display = ctx.body.name?.trim() || phone;
            const created = await ctx.context.internalAdapter.createUser({
              email: syntheticEmailForPhone(),
              name: display,
              username: handle,
              displayName: ctx.body.name?.trim() || display,
              phoneNumber: phone,
              phoneNumberVerified: true,
              emailVerified: false,
            });
            if (!created) {
              throw APIError.from("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.FAILED_TO_CREATE_USER);
            }
            user = created as User;
          } else {
            const updates: Record<string, unknown> = { phoneNumberVerified: true };
            if (ctx.body.name?.trim()) {
              updates.name = ctx.body.name.trim();
              updates.displayName = ctx.body.name.trim();
            }
            const updated = await ctx.context.internalAdapter.updateUser(user.id, updates);
            if (!updated) {
              throw APIError.from("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.FAILED_TO_UPDATE_USER);
            }
            user = updated as User;
          }

          const session = await ctx.context.internalAdapter.createSession(user.id);
          if (!session) {
            throw APIError.from("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION);
          }

          await setSessionCookie(ctx, { session, user });

          return ctx.json({
            token: session.token,
            user: parseUserOutput(ctx.context.options, user),
          });
        },
      ),

      phoneOtpUpdateStart: createAuthEndpoint(
        "/phone-otp/update/start",
        {
          method: "POST",
          body: startBodySchema,
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              description: "Send a phone OTP to the signed-in user's new number (Settings).",
            },
          },
        },
        async (ctx) => {
          if (!ctx.context.session?.user?.id) {
            throw APIError.from("UNAUTHORIZED", {
              code: "UNAUTHORIZED",
              message: "You must be signed in to change your phone number.",
            });
          }
          await startPhoneOtp(ctx.request, ctx.body.phone);
          return ctx.json({ ok: true });
        },
      ),

      phoneOtpUpdateVerify: createAuthEndpoint(
        "/phone-otp/update/verify",
        {
          method: "POST",
          body: updateVerifyBodySchema,
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              description: "Verify a phone OTP and set the number on the current session user.",
            },
          },
        },
        async (ctx) => {
          const session = ctx.context.session;
          if (!session?.user?.id) {
            throw APIError.from("UNAUTHORIZED", {
              code: "UNAUTHORIZED",
              message: "You must be signed in to update your phone number.",
            });
          }

          const phone = requireE164(ctx.body.phone);
          assertOtpVerified(await verifyOtp(phone, ctx.body.code), phone);

          const owner = (await ctx.context.adapter.findOne({
            model: "user",
            where: [{ field: "phoneNumber", value: phone }],
          })) as User | null;

          if (owner && owner.id !== session.user.id) {
            throw APIError.from("BAD_REQUEST", {
              code: "PHONE_IN_USE",
              message: "This phone number is already used on another account.",
            });
          }

          const updated = await ctx.context.internalAdapter.updateUser(session.user.id, {
            phoneNumber: phone,
            phoneNumberVerified: true,
          });
          if (!updated) {
            throw APIError.from("INTERNAL_SERVER_ERROR", BASE_ERROR_CODES.FAILED_TO_UPDATE_USER);
          }

          await setSessionCookie(ctx, {
            session: session.session,
            user: updated,
          });

          return ctx.json({
            user: parseUserOutput(ctx.context.options, updated),
          });
        },
      ),
    },
  };
}
