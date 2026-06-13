import type { MarketingSection } from "@/lib/copy/marketing-pages";
import { cn } from "@/lib/utils";

export function MarketingSections({
  sections,
  className,
}: {
  sections: MarketingSection[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-8 sm:space-y-10", className)}>
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-2xl border border-white/8 bg-[oklch(14%_0.012_110/0.72)] p-5 sm:p-6"
        >
          <h2 className="text-base sm:text-lg font-semibold text-white">{section.title}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-sm sm:text-[15px] leading-relaxed text-white/52">
              {paragraph}
            </p>
          ))}
          {section.bullets ? (
            <ul className="mt-3 space-y-2.5">
              {section.bullets.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm sm:text-[15px] leading-relaxed text-white/52">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[oklch(88%_0.11_105/0.75)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
