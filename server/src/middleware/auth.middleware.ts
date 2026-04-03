import { auth } from "@/core/auth/auth";
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

        userId: string
    }
}

export const authMiddleware = async (c: Context, next: Next) => {
    try {

        const session = await auth.api.getSession({
            headers: c.req.raw.headers
        });

        if (!session) {
            throw new UnauthorizedError();
        }

        c.set("user", {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            emailVerified: session.user.emailVerified,
            image: session.user.image,
        })

        c.set("session", {
            id: session.session.id,
            expiresAt: session.session.expiresAt,
            token: session.session.token,
        });

        c.set("userId", session.user.id)
        await next();
    }

    catch (error) {
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