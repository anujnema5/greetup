import { CURRENT_HOST } from "@/shared/constants";

/** Where new / returning-but-incomplete users land after sign-in. */
export const POST_AUTH_PATH = "/profile-setup";

/** Post-auth redirect URL trusted by Better Auth (must match the tab origin + `WEB_CLIENT_HOST`). */
export function getAuthCallbackUrl(path = POST_AUTH_PATH): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin =
    typeof window !== "undefined" ? window.location.origin : CURRENT_HOST;
  return `${origin.replace(/\/+$/, "")}${normalizedPath}`;
}
