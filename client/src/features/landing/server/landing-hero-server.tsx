import {
  MessageCircle,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EARLY_RELEASE } from "@/lib/copy/user-messages";
import { LandingHeroVisual } from "../components/landing-hero-visual";
import { LandingHeroNav, LandingHeroPrimaryCta } from "../components/landing-hero-actions";
import { LandingActivityChips } from "../components/landing-activity-chips";
import { LANDING_HERO_ACTIVITY_HIGHLIGHTS } from "../lib/landing-activities";

const HERO_SIGNALS = [
  { icon: Sparkles, label: "Activity match" },
  { icon: ShieldCheck, label: "NSFW protected" },
  { icon: Shield, label: "Secure calls" },
  { icon: MessageCircle, label: "Chat & video" },
] as const;

function HeroBackdropStatic() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,oklch(76%_0.14_96/0.18),transparent_72%)] dark:bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,oklch(26%_0.06_285/0.5),transparent_72%)]" />
      <div className="absolute -top-28 -left-36 h-[400px] w-[400px] rounded-full bg-primary/8 blur-[96px]" />
      <div className="absolute top-[16%] -right-20 h-[340px] w-[340px] rounded-full bg-secondary/10 blur-[88px]" />
      <div className="absolute bottom-[8%] left-[22%] h-[260px] w-[260px] rounded-full bg-secondary/6 blur-[72px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_100%_at_50%_50%,transparent_44%,oklch(96%_0.01_95/0.9)_94%)] dark:bg-[radial-gradient(ellipse_120%_100%_at_50%_50%,transparent_44%,oklch(10%_0.02_285)_94%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

export function LandingHeroServer() {
  return (
    <>
      <LandingHeroNav />

      <section className="relative lg:min-h-[calc(100dvh-4rem)] flex flex-col justify-center pt-24 sm:pt-28 pb-8 sm:pb-16 lg:pb-24 px-5 sm:px-6">
        <HeroBackdropStatic />

        <div className="relative mx-auto w-full max-w-7xl flex flex-col gap-5 sm:gap-8 lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-20 lg:items-center">
          <div className="mt-2 sm:mt-0 text-center lg:text-left lg:max-w-[34rem] order-1">
            <div className="mb-5 sm:mb-6 flex justify-center lg:justify-start">
              <Badge
                variant="outline"
                className="border-border bg-muted/60 landing-muted rounded-full px-3.5 py-1 text-xs font-normal"
              >
                Beta · Free to join
              </Badge>
            </div>

            <h1 className="text-[1.95rem] leading-[1.1] sm:text-[2.85rem] lg:text-[3.75rem] xl:text-[4.15rem] font-semibold tracking-[-0.025em] mb-4 sm:mb-6">
              Instantly <span className="text-secondary">connect</span>
              <span className="mt-1 sm:mt-1.5 block text-foreground">with the people you want.</span>
              <span className="mt-4 sm:mt-6 block text-[0.82em] sm:text-[0.78em] font-medium landing-muted">
                Chat, voice, or video.
              </span>
              <span className="mt-1 sm:mt-1.5 block text-[0.72em] sm:text-[0.65em] font-normal text-muted-foreground">
                It&apos;s up to you.
              </span>
            </h1>

            <p className="text-[13px] leading-[1.55] sm:text-[1.05rem] sm:leading-relaxed landing-muted w-full max-w-lg mx-auto lg:mx-0 mb-4 sm:mb-5">
              Find people by job, city, or activity — vent, yap, practice language, and more. Safe, moderated,
              and NSFW-free.
            </p>

            <div className="mb-5 sm:mb-6 w-full flex justify-center lg:justify-start">
              <LandingActivityChips
                items={LANDING_HERO_ACTIVITY_HIGHLIGHTS}
                size="sm"
                className="max-w-full justify-center lg:justify-start"
              />
            </div>

            <div className="mb-7 sm:mb-9 flex flex-wrap justify-center lg:justify-start gap-x-5 sm:gap-x-6 gap-y-2">
              {HERO_SIGNALS.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-[12px] sm:text-sm landing-muted"
                >
                  <Icon
                    className="size-3 sm:size-3.5 text-secondary/65"
                    strokeWidth={1.75}
                  />
                  {label}
                </span>
              ))}
            </div>

            <LandingHeroPrimaryCta />

            <div className="mt-5 sm:mt-9 pt-4 sm:pt-7 border-t border-border">
              <p className="text-xs landing-muted max-w-md mx-auto lg:mx-0 leading-relaxed">
                {EARLY_RELEASE.noticeShort}
              </p>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end lg:py-4 order-2 w-full">
            <LandingHeroVisual />
          </div>
        </div>
      </section>
    </>
  );
}
