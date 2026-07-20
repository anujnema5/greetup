import { authClient } from "@/lib/auth-client";
import { isAuthRequiredPath } from "@/features/auth/lib/app-route-guards";
import { buildLoginUrl } from "@/features/auth/lib/auth-callback-url";
import { clearGuestTryQueries } from "@/features/guest-try/lib/clear-guest-try-queries";

let unauthorizedRedirectInFlight = false;

/**
 * On 401 from an app-shell route: confirm the session is gone, then send the
 * user to `/login?next=<route>` so they return here after re-auth. Skips
 * transient 401s while a cookie is still settling.
 */
export function redirectToPublicHomeOnUnauthorized(): void {
  if (typeof window === "undefined" || unauthorizedRedirectInFlight) return;

  const { pathname, search } = window.location;
  if (pathname === "/" || pathname.startsWith("/login")) return;
  if (!isAuthRequiredPath(pathname)) return;

  const loginUrl = buildLoginUrl(`${pathname}${search}`);

  unauthorizedRedirectInFlight = true;

  void authClient
    .getSession()
    .then(({ data }) => {
      if (data?.user) {
        unauthorizedRedirectInFlight = false;
        return;
      }

      return authClient
        .signOut()
        .catch(() => undefined)
        .finally(() => {
          clearGuestTryQueries();
          window.location.replace(loginUrl);
        });
    })
    .catch(() => {
      unauthorizedRedirectInFlight = false;
    });
}
