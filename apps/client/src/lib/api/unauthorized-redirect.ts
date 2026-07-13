import { authClient } from "@/lib/auth-client";
import { isAuthRequiredPath } from "@/features/auth/lib/app-route-guards";

let unauthorizedRedirectInFlight = false;

/**
 * On 401 from an app-shell route: confirm the session is gone, then send the
 * user to `/`. Skips transient 401s while a cookie is still settling.
 */
export function redirectToPublicHomeOnUnauthorized(): void {
  if (typeof window === "undefined" || unauthorizedRedirectInFlight) return;

  const { pathname } = window.location;
  if (pathname === "/" || pathname.startsWith("/login")) return;
  if (!isAuthRequiredPath(pathname)) return;

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
          window.location.replace("/");
        });
    })
    .catch(() => {
      unauthorizedRedirectInFlight = false;
    });
}
