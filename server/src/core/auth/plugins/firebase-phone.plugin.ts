import { createAuthEndpoint } from "@better-auth/core/api";
import type { User } from "@better-auth/core/db";
import { APIError, BASE_ERROR_CODES } from "@better-auth/core/error";
import { generateRandomString } from "better-auth/crypto";
import { setSessionCookie } from "better-auth/cookies";
import { parseUserOutput } from "better-auth/db";
import { sessionMiddleware } from "better-auth/api";
import * as z from "zod";

import { getFirebaseAdmin } from "@/core/firebase/admin";
import { readFirebaseErrorCode } from "@/core/firebase/parse-firebase-error";
import logger from "@/core/logging";
import config from "@/shared/config/config";

const signInBodySchema = z.object({
  idToken: z.string().min(1),
  /** Optional display name when signing up from the phone registration flow. */
  name: z.string().min(1).max(100).optional(),
});

const updatePhoneBodySchema = z.object({
  idToken: z.string().min(1),
});

function syntheticEmailForFirebaseUid(uid: string): string {
  return `fb_${uid}@firebase.greetup.local`;
}

/**
 * Verifies a Firebase Phone Auth ID token and issues a Better Auth session cookie.
 */
export function firebasePhonePlugin() {
  return {
    id: "firebase-phone",
    endpoints: {
      firebasePhoneUpdate: createAuthEndpoint(
        "/firebase-phone-update",
        {
          method: "POST",
          body: updatePhoneBodySchema,
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              description:
                "Verify Firebase Phone ID token and set phone on the current session user (Settings).",
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

          let decoded: import("firebase-admin/auth").DecodedIdToken;
          try {
            decoded = await getFirebaseAdmin().auth().verifyIdToken(ctx.body.idToken);
          } catch (err: unknown) {
            const firebaseCode = readFirebaseErrorCode(err);
            logger.warn("Firebase verifyIdToken failed (phone update)", {
              firebaseCode,
              ...(config.env !== "production"
                ? { message: err instanceof Error ? err.message : String(err) }
                : {}),
            });
            throw APIError.from("UNAUTHORIZED", {
              ...BASE_ERROR_CODES.INVALID_TOKEN,
              message: "Invalid or expired Firebase ID token",
            });
          }

          const phone = decoded.phone_number;
          if (!phone) {
            throw APIError.from("BAD_REQUEST", {
              code: "PHONE_CLAIM_MISSING",
              message: "This token is not from phone authentication",
            });
          }

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
      firebasePhone: createAuthEndpoint(
        "/firebase-phone",
        {
          method: "POST",
          body: signInBodySchema,
          metadata: {
            openapi: {
              description: "Exchange Firebase Phone Auth ID token for Better Auth session",
            },
          },
        },
        async (ctx) => {
          let decoded: import("firebase-admin/auth").DecodedIdToken;
          try {
            decoded = await getFirebaseAdmin().auth().verifyIdToken(ctx.body.idToken);
          } catch (err: unknown) {
            const firebaseCode = readFirebaseErrorCode(err);
            const message = err instanceof Error ? err.message : String(err);
            logger.warn("Firebase verifyIdToken failed", {
              firebaseCode,
              ...(config.env !== "production"
                ? {
                    message,
                    hint: "Service account project_id must match NEXT_PUBLIC_FIREBASE_PROJECT_ID; use one-line JSON in .env.",
                  }
                : {}),
            });
            throw APIError.from("UNAUTHORIZED", {
              ...BASE_ERROR_CODES.INVALID_TOKEN,
              message: "Invalid or expired Firebase ID token",
            });
          }

          const phone = decoded.phone_number;
          if (!phone) {
            throw APIError.from("BAD_REQUEST", {
              code: "PHONE_CLAIM_MISSING",
              message: "This token is not from phone authentication",
            });
          }

          const firebaseUid = decoded.uid;
          const syntheticEmail = syntheticEmailForFirebaseUid(firebaseUid);

          let user = (await ctx.context.adapter.findOne({
            model: "user",
            where: [{ field: "phoneNumber", value: phone }],
          })) as User | null;

          if (!user) {
            const handle = `u_${generateRandomString(12)}`;
            const display = ctx.body.name?.trim() || phone;
            const created = await ctx.context.internalAdapter.createUser({
              email: syntheticEmail,
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
    },
  };
}
