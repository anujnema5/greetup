// features/auth/components/auth-page-layout.tsx
import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

interface AuthPageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  footerText: string;
  footerLinkText: string;
  onFooterLinkClick: () => void;
  backHref?: string;
  backLabel?: string;
}

export default function AuthPageLayout({
  children,
  title,
  subtitle,
  footerText,
  footerLinkText,
  onFooterLinkClick,
  backHref,
  backLabel = "Back to home",
}: AuthPageLayoutProps) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-linear-to-br from-background via-background to-muted/20">
      {backHref ? (
        <Link
          href={backHref}
          className="absolute left-6 top-6 z-10 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 shrink-0" />
          {backLabel}
        </Link>
      ) : null}

      <div className="grid h-full w-full max-w-7xl gap-8 p-6 lg:grid-cols-2 lg:gap-12 lg:p-8">
        <main className="flex items-center justify-center">
          <div className="w-full max-w-md space-y-6">
            <div className="flex flex-col items-center space-y-6">
              <Logo className="scale-110" />

              <div className="space-y-1.5 text-center">
                <h1 className="text-xl font-bold tracking-tight sm:text-[1.35rem]">{title}</h1>
                {subtitle ? (
                  <p className="text-[13px] leading-snug text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-6 text-sm">{children}</div>

            <div className="border-t border-border/60 pt-3">
              <p className="text-center text-sm text-muted-foreground">
                {footerText}{" "}
                <button
                  type="button"
                  onClick={onFooterLinkClick}
                  className="font-semibold text-primary cursor-pointer underline-offset-4 transition-all hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
                >
                  {footerLinkText}
                </button>
              </p>
            </div>
          </div>
        </main>

        <aside
          aria-label="About Greetup"
          className="hidden items-center justify-center lg:flex"
        >
          <div className="relative h-full min-h-[600px] w-full overflow-hidden rounded-2xl border-2 bg-linear-to-br from-primary/10 via-primary/5 to-background shadow-2xl backdrop-blur-sm">
            <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" aria-hidden />
            <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" aria-hidden />

            <div className="relative z-10 flex h-full flex-col items-center justify-center space-y-8 px-12 text-center">
              <div className="space-y-4">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                  <span className="text-2xl font-black leading-none tracking-[-0.03em]" aria-hidden>
                    G
                  </span>
                </div>

                <h2 className="text-3xl font-bold tracking-tight">Greetup</h2>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                  Connect, talk, and share in real time with your people. Experience seamless
                  communication like never before.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8">
                <div className="space-y-2">
                  <div className="text-lg font-bold text-primary">100K+</div>
                  <div className="text-xs text-muted-foreground">Active Users</div>
                </div>
                <div className="space-y-2">
                  <div className="text-lg font-bold text-primary">24/7</div>
                  <div className="text-xs text-muted-foreground">Available</div>
                </div>
                <div className="space-y-2">
                  <div className="text-lg font-bold text-primary">Secure</div>
                  <div className="text-xs text-muted-foreground">Encrypted</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
    </div>
  );
}
