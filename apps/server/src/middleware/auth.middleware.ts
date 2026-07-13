import { auth } from "@/core/auth/auth";
import logger from "@/core/logging";
import { resolveGuestAuthContext } from "@/modules/guest";
import { userProfilesRepository } from "@/modules/profile/repositories/user-profiles.repository";
import { EmailNotVerifiedError, PremiumSubscriptionExpiredError, PremiumSubscriptionRequiredError, UnauthorizedError } from "@/shared/errors";
import type { Context, Next } from "hono";

declare module "hono" {
    interface ContextVariableMap {
        user: {
            id: string;
            email: string; 
            name: string;
            emailVerified: boolean;
            image?: string | null; 
        };
        session: {
            id: string;
            expiresAt: Date;
            token: string;
        };

        userId: string;
        /** True for ephemeral try-before-signup accounts. */
        isGuest: boolean;
        /** True after the guest used their one free direct call. */
        guestTrialConsumed: boolean;
    }
}

export const authMiddleware = async (c: Context, next: Next) => {
    try {

        const session = await auth.api.getSession({
            headers: c.req.raw.headers
        });

        if (!session) {
            const cookie = c.req.header("cookie") ?? "";
            const hasSessionCookie =
                cookie.includes("better-auth.session_token") ||
                cookie.includes("__Secure-better-auth.session_token");
            logger.warn("authMiddleware: no Better Auth session", {
                path: c.req.path,
                hasSessionCookie,
            });
            throw new UnauthorizedError();
        }

        const sessionUser = session.user as { displayName?: string | null; name?: string | null };
        const resolvedName = sessionUser.displayName?.trim() || sessionUser.name?.trim() || "";

        c.set("user", {
            id: session.user.id,
            email: session.user.email,
            name: resolvedName,
            emailVerified: session.user.emailVerified,
            image: session.user.image,
        })

        c.set("session", {
            id: session.session.id,
            expiresAt: session.session.expiresAt,
            token: session.session.token,
        });

        c.set("userId", session.user.id);

        const guestAuth = await resolveGuestAuthContext(session.user.id);
        c.set("isGuest", guestAuth.isGuest);
        c.set("guestTrialConsumed", guestAuth.guestTrialConsumed);

        await next();
    }

    catch (error) {
        if (error instanceof UnauthorizedError) {
            throw error;
        }
        logger.error("authMiddleware: getSession failed", error instanceof Error ? error : undefined);
        throw new UnauthorizedError();
    }
}

export const verifiedEmailMiddleware = async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
        throw new UnauthorizedError();
    }

    if (!user.emailVerified) {
        throw new EmailNotVerifiedError();
    }

    await next();
}

export const premiumMiddleware = async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
        throw new UnauthorizedError();
    }

    const profile = await userProfilesRepository.findPremiumFieldsByUserId(user.id);

    if (!profile?.isPremium) {
        throw new PremiumSubscriptionRequiredError();
    }

    if (profile.premiumExpiresAt && new Date() > profile.premiumExpiresAt) {
        throw new PremiumSubscriptionExpiredError();
    }

    await next();
}