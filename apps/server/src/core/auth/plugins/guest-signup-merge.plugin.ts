import { getCurrentAuthContext } from "@better-auth/core/context";
import { createAuthMiddleware } from "@better-auth/core/api";
import type { AuthContext } from "better-auth";
import {
  clearGuestSignupMergeCandidate,
  getGuestSignupMergeCandidate,
  type GuestSignupAuthPluginContext,
} from "@/modules/guest/lib/guest-signup-auth-context";
import { resolveGuestSignupProviderFromRequestUrl } from "@/modules/guest/lib/resolve-guest-signup-provider-from-request";
import { detectGuestSignupOnRegister } from "@/modules/guest/services/session/detect-guest-signup-on-register.service";
import {
  isGuestPlaceholderEmail,
  upgradeGuestUserOnSignup,
} from "@/modules/guest/services/session/upgrade-guest-user-on-signup.service";
import type { GuestSignupRegisterProvider } from "@/modules/guest/types/guest-signup.types";

const WRAPPED_SYMBOL = Symbol("guestSignupMergeWrapped");

type GuestSignupMergeInternalAdapter = AuthContext["internalAdapter"] & {
  [WRAPPED_SYMBOL]?: boolean;
};

function isSignupMergePath(path: string | undefined): boolean {
  if (!path) {
    return false;
  }
  return (
    path === "/sign-up/email" ||
    path.startsWith("/callback/") ||
    path === "/phone-otp/verify"
  );
}

async function resolveMergeContext(
  pluginContext: GuestSignupAuthPluginContext | undefined,
  provider: GuestSignupRegisterProvider,
  headers: Headers | undefined,
): Promise<ReturnType<typeof getGuestSignupMergeCandidate>> {
  const merge = getGuestSignupMergeCandidate(pluginContext);
  if (merge) {
    return merge;
  }
  if (!headers || !pluginContext) {
    return null;
  }

  await detectGuestSignupOnRegister({
    headers,
    provider,
    authPluginContext: pluginContext,
    metadata: { hook: "guest-signup-merge.adapter" },
  });

  return getGuestSignupMergeCandidate(pluginContext);
}

/**
 * Wraps Better Auth `createUser` / `createOAuthUser` so signup upgrades the guest row
 * instead of inserting a duplicate `users` record (Step 21).
 */
export function installGuestSignupMergeInternalAdapterWrap(ctx: AuthContext): void {
  const adapter = ctx.internalAdapter as GuestSignupMergeInternalAdapter;
  if (adapter[WRAPPED_SYMBOL]) {
    return;
  }

  const originalCreateUser = adapter.createUser.bind(adapter);
  const originalCreateOAuthUser = adapter.createOAuthUser.bind(adapter);

  // Better Auth's generic createUser return type is not preserved through guest upgrade.
  const wrappedCreateUser = async (user: Parameters<typeof originalCreateUser>[0]) => {
    const email = typeof user.email === "string" ? user.email : undefined;
    if (isGuestPlaceholderEmail(email)) {
      return originalCreateUser(user);
    }

    const authCtx = await getCurrentAuthContext().catch(() => null);
    const pluginContext = authCtx?.context as GuestSignupAuthPluginContext | undefined;
    const provider = resolveGuestSignupProviderFromRequestUrl(authCtx?.request?.url);
    const merge = await resolveMergeContext(
      pluginContext,
      provider,
      authCtx?.request?.headers,
    );

    if (!merge) {
      return originalCreateUser(user);
    }

    try {
      const upgraded = await upgradeGuestUserOnSignup({
        mergeContext: merge,
        incoming: user,
        provider,
        updateUser: adapter.updateUser.bind(adapter),
      });
      if (pluginContext) {
        clearGuestSignupMergeCandidate(pluginContext);
      }
      return upgraded as Awaited<ReturnType<typeof originalCreateUser>>;
    } catch (error) {
      if (pluginContext) {
        clearGuestSignupMergeCandidate(pluginContext);
      }
      throw error;
    }
  };
  adapter.createUser = wrappedCreateUser as typeof originalCreateUser;

  const wrappedCreateOAuthUser = async (
    user: Parameters<typeof originalCreateOAuthUser>[0],
    account: Parameters<typeof originalCreateOAuthUser>[1],
  ) => {
    const email = typeof user.email === "string" ? user.email : undefined;
    if (isGuestPlaceholderEmail(email)) {
      return originalCreateOAuthUser(user, account);
    }

    const authCtx = await getCurrentAuthContext().catch(() => null);
    const pluginContext = authCtx?.context as GuestSignupAuthPluginContext | undefined;
    const merge = await resolveMergeContext(
      pluginContext,
      "google",
      authCtx?.request?.headers,
    );

    if (!merge) {
      return originalCreateOAuthUser(user, account);
    }

    try {
      const upgraded = await upgradeGuestUserOnSignup({
        mergeContext: merge,
        incoming: user,
        provider: "google",
        updateUser: adapter.updateUser.bind(adapter),
      });
      const linkedAccount = await adapter.createAccount({
        ...account,
        userId: upgraded.id,
      });
      if (pluginContext) {
        clearGuestSignupMergeCandidate(pluginContext);
      }
      return { user: upgraded, account: linkedAccount } as Awaited<
        ReturnType<typeof originalCreateOAuthUser>
      >;
    } catch (error) {
      if (pluginContext) {
        clearGuestSignupMergeCandidate(pluginContext);
      }
      throw error;
    }
  };
  adapter.createOAuthUser = wrappedCreateOAuthUser as typeof originalCreateOAuthUser;

  adapter[WRAPPED_SYMBOL] = true;
}

/**
 * Detects guest sessions on signup routes and upgrades guests in place on user creation.
 */
export function guestSignupMergePlugin() {
  return {
    id: "guest-signup-merge",
    init(ctx: AuthContext) {
      queueMicrotask(() => installGuestSignupMergeInternalAdapterWrap(ctx));
      return {};
    },
    hooks: {
      before: [
        {
          matcher(ctx: { path?: string }) {
            return isSignupMergePath(ctx.path);
          },
          handler: createAuthMiddleware(async (ctx) => {
            await detectGuestSignupOnRegister({
              headers: ctx.request?.headers,
              provider: resolveGuestSignupProviderFromRequestUrl(ctx.request?.url),
              authPluginContext: ctx.context as GuestSignupAuthPluginContext,
              metadata: { hook: "guest-signup-merge.before" },
            });
          }),
        },
      ],
    },
  };
}
