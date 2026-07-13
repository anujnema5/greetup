import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { FOOTER_LINKS } from "@/lib/copy/marketing-pages";
import { cn } from "@/lib/utils";

type MarketingPageShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function MarketingPageShell({
  eyebrow,
  title,
  description,
  children,
  className,
}: MarketingPageShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0A0A0A] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,oklch(22%_0.025_105/0.55),transparent_72%)]" />
        <div className="absolute -top-28 -left-36 h-[360px] w-[360px] rounded-full bg-[oklch(88%_0.11_105/0.06)] blur-[96px]" />
        <div className="absolute top-[20%] -right-24 h-[300px] w-[300px] rounded-full bg-[oklch(88%_0.11_105/0.05)] blur-[88px]" />
        <div className="absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_88%_82%_at_50%_30%,#000_28%,transparent_80%)] bg-dot-grid-marketing" />
      </div>

      <header className="relative z-10 border-b border-white/6 bg-[#0A0A0A]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="rounded-full bg-[oklch(88%_0.11_105)] text-[oklch(12%_0.012_110)] hover:brightness-110 font-semibold shadow-[0_0_24px_oklch(88%_0.11_105/0.22)]"
              asChild
            >
              <Link href="/register">
                Get started <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/42 transition-colors hover:text-white/70"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>

        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[oklch(88%_0.11_105/0.75)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[1.85rem] sm:text-4xl lg:text-[2.65rem] font-bold tracking-[-0.025em] leading-tight">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 text-sm sm:text-base text-white/45 leading-relaxed">{description}</p>
          ) : null}
        </div>

        <div className={cn("mt-8 sm:mt-10 max-w-3xl", className)}>{children}</div>
      </main>

      <footer className="relative z-10 border-t border-white/6 bg-[oklch(12%_0.01_110)] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <Logo />
          <nav className="flex flex-wrap justify-center gap-1">
            {FOOTER_LINKS.map(({ label, href }) => (
              <Button
                key={href}
                variant="ghost"
                size="sm"
                className="rounded-full text-xs text-white/35 hover:bg-white/5 hover:text-white/60"
                asChild
              >
                <Link href={href}>{label}</Link>
              </Button>
            ))}
          </nav>
          <p className="text-xs text-white/25">© 2026 Greetup. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
