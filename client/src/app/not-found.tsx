import Link from "next/link";

/** Shared 404 UI — also used when unauthenticated users probe protected app routes. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page does not exist or you do not have access to it.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go home
        </Link>
        <Link href="/login" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </div>
    </main>
  );
}
