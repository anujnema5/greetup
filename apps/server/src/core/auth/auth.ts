import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { db } from "../database";
import { firebasePhonePlugin } from "@/core/auth/plugins/firebase-phone.plugin";
import { guestSessionPlugin } from "@/core/auth/plugins/guest-session.plugin";
import { guestSignupMergePlugin } from "@/core/auth/plugins/guest-signup-merge.plugin";
import { betterAuthRedisRateLimitStorage } from "@/core/rate-limit";
import { sendEmail } from "@/services/email";
import logger from "../logging";
import config from "@/shared/config/config";
import { BETTER_AUTH_URL, SERVER_URL, WEB_CLIENT_HOST } from "@/shared/constants";
import * as schema from "@/core/database/schema";

const normalizedBetterAuthUrl = BETTER_AUTH_URL?.replace(/\/$/, "");
const normalizedServerUrl = SERVER_URL?.replace(/\/$/, "");
const publicAuthBaseUrl = normalizedServerUrl || normalizedBetterAuthUrl;
const normalizedWebClientHost = WEB_CLIENT_HOST?.replace(/\/$/, "");
const oauthErrorRedirectUrl = `${normalizedWebClientHost}/login`;
const crossSubDomainCookies = config.authCookieDomain
  ? { enabled: true, domain: config.authCookieDomain }
  : { enabled: false };

function betterAuthLog(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  ...args: unknown[]
) {
  const first = args[0];
  if (first instanceof Error) {
    const stateError = first as Error & {
      code?: string;
      details?: unknown;
    };
    logger[level](`[better-auth] ${message}`, {
      err: first,
      code: stateError.code,
      details: stateError.details,
      authCookieDomain: config.authCookieDomain ?? null,
    });
    return;
  }

  if (args.length === 0) {
    logger[level](`[better-auth] ${message}`);
    return;
  }

  if (args.length === 1 && typeof first === "object" && first !== null) {
    logger[level](`[better-auth] ${message}`, first);
    return;
  }

  logger[level](`[better-auth] ${message}`, { args });
}

if (!publicAuthBaseUrl) {
  throw new Error(
    "Auth base URL is missing. Set SERVER_URL or BETTER_AUTH_URL to a valid absolute URL.",
  );
}

if (config.env === "production" && !config.authCookieDomain) {
  logger.warn(
    "AUTH_COOKIE_DOMAIN is unset in production; Google OAuth state cookies are host-only and may fail across api.* / apex",
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
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: config.env === "production",
    },
    /** Prefer Cloudflare / proxy headers when present (rate limit + session IP). */
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"],
    },
  },

  /**
   * Built-in Better Auth limiter (sign-in/up, password reset, verification, etc.).
   * Redis-backed so limits hold across multiple server instances.
   * Default special rules: 3/10s for sign-in|sign-up; 3/60s for reset/verify email.
   */
  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
    customStorage: betterAuthRedisRateLimitStorage,
    customRules: {
      "/firebase-phone": { window: 60, max: 10 },
      "/firebase-phone-update": { window: 60, max: 20 },
    },
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

  /**
   * Cookie strategy avoids intermittent `state_mismatch` / `state_security_mismatch` from the
   * default DB strategy (signed `state` cookie is 5m while DB verification is 10m; also avoids
   * verification row races). Requires AUTH_COOKIE_DOMAIN in prod for api.* ↔ apex.
   * @see https://better-auth.com/docs/reference/errors/state_mismatch
   */
  account: {
    storeStateStrategy: "cookie",
  },

  /**
   * Production Better Auth otherwise redirects `/api/auth/error` → `/?error=…` on the API host
   * (api.greetup.co JSON root). Send OAuth failures to the web login page instead.
   */
  onAPIError: {
    errorURL: oauthErrorRedirectUrl,
    onError(error) {
      logger.error("Better Auth API error", {
        error,
        authCookieDomain: config.authCookieDomain ?? null,
      });
    },
  },

  logger: {
    level: config.env === "production" ? "warn" : "debug",
    log: betterAuthLog,
  },

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
