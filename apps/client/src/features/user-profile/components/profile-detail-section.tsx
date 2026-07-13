import type { ReactNode } from "react";

type ProfileDetailSectionProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
};

export function ProfileDetailSection({ title, icon, children }: ProfileDetailSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
