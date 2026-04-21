import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI, phoneNumber } from "better-auth/plugins";
import { db } from "../database";
import { sendEmail } from "@/services/email";
import logger from "../logging";
import config from "@/shared/config/config";
import { BETTER_AUTH_URL, DEV_NOTIFICATION_EMAIL, SERVER_URL } from "@/shared/constants";
import * as schema from "@/core/database/schema"

// npx @better-auth/cli generate --config ./src/core/auth/index.ts

const normalizedBetterAuthUrl = BETTER_AUTH_URL?.replace(/\/$/, "");
const normalizedServerUrl = SERVER_URL?.replace(/\/$/, "");
const publicAuthBaseUrl = normalizedServerUrl || normalizedBetterAuthUrl;
const crossSubDomainCookies = config.authCookieDomain
  ? {
      enabled: true,
      domain: config.authCookieDomain,
    }
  : {
      enabled: false,
    };

if (!publicAuthBaseUrl) {
  throw new Error(
    "Auth base URL is missing. Set SERVER_URL or BETTER_AUTH_URL to a valid absolute URL.",
  );
}

const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.users,
    },
  }),

  advanced: {
    useSecureCookies: config.env === "production",
    crossSubDomainCookies,
  },


  plugins: [
    openAPI(),

    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        logger.info("OTP generated", {
          phoneNumber,
          otp: config.env === "development" ? code : "hidden",
        });

        // TODO: integrate SMS provider here
      },
    }),
  ],

  // Let Better Auth generate user/session/account IDs (required when users.id has no DB default)
  // advanced.database.generateId defaults to true; only set to false if your DB has DEFAULT on id columns

  signUpOnVerification: {
    getTempEmail: (phoneNumber: string) => {
      logger.debug("Generating temp email from phone number", {
        phoneNumber,
      });
      return `${phoneNumber}@my-site.com`;
    },

    getTempName: (phoneNumber: string) => {
      logger.debug("Generating temp name from phone number", {
        phoneNumber,
      });
      return phoneNumber;
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    sendResetPassword: async ({ user, url, token }, request) => {
      try {
        const resetUrl = url.replace(
          BETTER_AUTH_URL,
          publicAuthBaseUrl
        );

        logger.info("Password reset requested", {
          userId: user.id,
          email: user.email,
        });

        await sendEmail({
          to:
            config.env === "development"
              ? DEV_NOTIFICATION_EMAIL
              : user.email,
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
        const verificationUrl = url.replace(
          BETTER_AUTH_URL,
          publicAuthBaseUrl
        );

        logger.info("Email verification requested", {
          userId: user.id,
          email: user.email,
        });

        await sendEmail({
          to:
            config.env === "development"
              ? DEV_NOTIFICATION_EMAIL
              : user.email,
          subject: "Verify your email address",
          text: `Click the link to verify your account:\n${verificationUrl}`,
        });

        logger.info("Verification email sent", {
          userId: user.id,
        });
      } 
      
      catch (error) {
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
      redirectURI: `${publicAuthBaseUrl}/api/auth/callback/google`
    },
  },
});

export { auth };
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
