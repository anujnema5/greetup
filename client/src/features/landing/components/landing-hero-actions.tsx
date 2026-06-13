"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { TRY_ROUTE } from "@/features/guest-try/constants/try-routes";
import { useLandingSession } from "../hooks/use-landing-session";

export function LandingHeroNav() {
  const { isLoggedIn, firstName } = useLandingSession();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/8 bg-[oklch(16%_0.012_110/0.94)] supports-[backdrop-filter]:bg-[oklch(16%_0.012_110/0.88)] md:supports-[backdrop-filter]:backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <span className="hidden sm:inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-medium text-white/80">
              Hi, {firstName || "there"}
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex text-white/65 hover:text-white hover:bg-white/6 rounded-full"
              asChild
            >
              <Link href="/login">Log in</Link>
            </Button>
          )}
          <Button
            size="sm"
            className="rounded-full bg-[oklch(88%_0.11_105)] text-[oklch(15%_0.02_110)] hover:brightness-110 shadow-lg shadow-[oklch(88%_0.11_105/0.3)] font-semibold"
            asChild
          >
            <Link href={isLoggedIn ? "/home" : TRY_ROUTE}>
              {isLoggedIn ? "Go to home" : "Get started"} <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

export function LandingHeroPrimaryCta() {
  const { isLoggedIn, firstName } = useLandingSession();

  return (
    <div className="flex flex-row flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start">
      <Button
        size="sm"
        className="rounded-full bg-[oklch(88%_0.11_105)] text-[oklch(12%_0.012_110)] hover:brightness-110 font-medium sm:font-semibold px-5 sm:px-6 has-[>svg]:px-5 sm:has-[>svg]:px-6 h-8 sm:h-10 lg:h-11 text-xs sm:text-sm w-auto shadow-[0_4px_18px_-6px_oklch(88%_0.11_105/0.45)] sm:shadow-[0_8px_28px_-8px_oklch(88%_0.11_105/0.55)]"
        asChild
      >
        <Link href={isLoggedIn ? "/home" : TRY_ROUTE}>
          {isLoggedIn ? `Welcome${firstName ? `, ${firstName}` : ""}` : "Find your people"}{" "}
          <ArrowRight className="size-3 sm:size-4" />
        </Link>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full border-white/10 bg-white/3 text-white/78 hover:bg-white/6 hover:text-white px-4 sm:px-6 h-8 sm:h-10 lg:h-11 text-xs sm:text-sm font-medium sm:font-semibold w-auto"
        asChild
      >
        <Link href="#how-it-works">How it works</Link>
      </Button>
    </div>
  );
}
