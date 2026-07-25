import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/features/marketing";
import { STORY_CONTENT } from "@/lib/copy/marketing-pages";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Meet people, not profiles",
  description:
    "The story behind Greetup: why we're building a safe, activity-first way to meet new people in real time.",
  path: "/story",
  noIndex: true,
});

export default function StoryPage() {
  return (
    <MarketingPageShell eyebrow={STORY_CONTENT.eyebrow} title={STORY_CONTENT.title}>
      <article className="space-y-5 sm:space-y-6">
        {STORY_CONTENT.blocks.map((block) => {
          if (block.type === "heading") {
            return (
              <h2
                key={block.text}
                className="pt-2 text-base sm:text-lg font-semibold text-white"
              >
                {block.text}
              </h2>
            );
          }

          if (block.type === "link") {
            return (
              <p
                key={block.href}
                className="text-sm sm:text-[15px] leading-relaxed text-white/52"
              >
                <Link
                  href={block.href}
                  className="text-[oklch(88%_0.11_105/0.85)] underline-offset-4 hover:underline"
                >
                  {block.label}
                </Link>
              </p>
            );
          }

          return (
            <p
              key={block.text}
              className="text-sm sm:text-[15px] leading-relaxed text-white/52"
            >
              {block.text}
            </p>
          );
        })}
      </article>
    </MarketingPageShell>
  );
}
