import type { ExchangeFirebaseSessionResult } from "@/features/auth/types";
import { apiUrl } from "@/lib/api/api-url";

export type { ExchangeFirebaseSessionResult };

/**
 * POST Better Auth custom endpoint: verifies Firebase ID token server-side and sets session cookie.
 */
export async function exchangeFirebaseSession(
  idToken: string,
  name?: string
): Promise<ExchangeFirebaseSessionResult> {
  const token = idToken.trim();
  const res = await fetch(apiUrl("/auth/firebase-phone"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken: token, ...(name?.trim() ? { name: name.trim() } : {}) }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = (await res.json()) as { message?: string };
      if (j?.message) detail = j.message;
    } catch {
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail || "Could not complete sign-in");
  }

  return (await res.json()) as ExchangeFirebaseSessionResult;
}
