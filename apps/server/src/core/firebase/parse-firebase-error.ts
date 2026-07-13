/** Firebase Admin / Auth errors often expose a string `code` (e.g. `auth/argument-error`). */
export function readFirebaseErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null || !("code" in err)) {
    return undefined;
  }
  const code = (err as { code: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
