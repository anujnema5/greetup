import { CURRENT_HOST } from "@/shared/constants";

/** Post-auth redirect URL trusted by Better Auth (must match the tab origin + `WEB_CLIENT_HOST`). */
export function getAuthCallbackUrl(path = "/home"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin =
    typeof window !== "undefined" ? window.location.origin : CURRENT_HOST;
  return `${origin.replace(/\/+$/, "")}${normalizedPath}`;
}
