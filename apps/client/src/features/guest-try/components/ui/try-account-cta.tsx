"use client";

import Link from "next/link";

import { TRY_LOGIN_ROUTE, TRY_SIGNUP_ROUTE } from "../../constants/try-routes";

/** Soft prompt under Continue — guests can leave /try for a full account. */
export function TryAccountCta() {
  return (
    <p className="mt-4 text-sm text-muted-foreground">
      Want the full experience?{" "}
      <Link
        href={TRY_SIGNUP_ROUTE}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Create an account
      </Link>{" "}
      or{" "}
      <Link
        href={TRY_LOGIN_ROUTE}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        log in
      </Link>
    </p>
  );
}
