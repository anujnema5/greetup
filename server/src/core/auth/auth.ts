import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { db } from "../database";
import { firebasePhonePlugin } from "@/core/auth/plugins/firebase-phone.plugin";
import { guestSessionPlugin } from "@/core/auth/plugins/guest-session.plugin";
import { guestSignupMergePlugin } from "@/core/auth/plugins/guest-signup-merge.plugin";
import { sendEmail } from "@/services/email";
import logger from "../logging";
import config from "@/shared/config/config";
import { BETTER_AUTH_URL, SERVER_URL } from "@/shared/constants";
import * as schema from "@/core/database/schema";

const normalizedBetterAuthUrl = BETTER_AUTH_URL?.replace(/\/$/, "");
const normalizedServerUrl = SERVER_URL?.replace(/\/$/, "");
const publicAuthBaseUrl = normalizedServerUrl || normalizedBetterAuthUrl;
const crossSubDomainCookies = config.authCookieDomain
  ? { enabled: true, domain: config.authCookieDomain }
  : { enabled: false };

if (!publicAuthBaseUrl) {
  throw new Error(
    "Auth base URL is missing. Set SERVER_URL or BETTER_AUTH_URL to a valid absolute URL.",
  );
}

function mapAuthUrlToPublicHost(url: string): string {
  return url.replace(BETTER_AUTH_URL, publicAuthBaseUrl);
}

function resolveAuthEmailRecipient(email: string): string {
  return email;
}

const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.users,
    },
  }),

  /**
   * Must match `users` columns used outside Better Auth defaults (see `schema/users.ts`).
   * Phone fields are server-written only (`input: false`) so clients cannot spoof them on email sign-up.
   */
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
      displayName: {
        type: "string",
        required: false,
      },
      phoneNumber: {
        type: "string",
        required: false,
        unique: true,
        input: false,
      },
      phoneNumberVerified: {
        type: "boolean",
        required: false,
        input: false,
      },
    },
  },

  advanced: {
    useSecureCookies: config.env === "production",
    crossSubDomainCookies,
  },
  plugins: [openAPI(), firebasePhonePlugin(), guestSessionPlugin(), guestSignupMergePlugin()],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    sendResetPassword: async ({ user, url, token }, request) => {
      try {
        const resetUrl = mapAuthUrlToPublicHost(url);

        logger.info("Password reset requested", {
          userId: user.id,
          email: user.email,
        });

        await sendEmail({
          to: resolveAuthEmailRecipient(user.email),
          subject: "Reset your password",
          text: `Click the link to reset your password:\n${resetUrl}`,
        });

        logger.info("Password reset email sent", {
          userId: user.id,
        });
      } catch (error) {
        logger.error("Failed to send password reset email", {
          error,
          userEmail: user.email,
        });
        throw error;
      }
    },

    onPasswordReset: async ({ user }, request) => {
      logger.warn("Password reset completed", {
        userId: user.id,
        email: user.email,
      });
    },
  },

  trustedOrigins: [publicAuthBaseUrl, config.webClientHost].filter(Boolean),

  emailVerification: {
    autoSignInAfterVerification: true,

    sendVerificationEmail: async ({ url, user }) => {
      try {
        const verificationUrl = mapAuthUrlToPublicHost(url);

        logger.info("Email verification requested", {
          userId: user.id,
          email: user.email,
        });

        await sendEmail({
          to: resolveAuthEmailRecipient(user.email),
          subject: "Verify your email address",
          text: `Click the link to verify your account:\n${verificationUrl}`,
        });

        logger.info("Verification email sent", {
          userId: user.id,
        });
      } catch (error) {
        logger.error("Failed to send verification email", {
          error,
          userEmail: user.email,
        });
        throw error;
      }
    },
  },

  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      redirectURI: `${publicAuthBaseUrl}/api/auth/callback/google`,
    },
  },
});

export { auth };
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
