import { memo } from "react";
import { Bell } from "lucide-react";

function DashboardHeaderInner() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-background shadow-sm">
      <div>
        <h1 className="text-[15px] font-semibold text-foreground leading-none">Good evening, Anuj</h1>
        <p className="text-[11px] text-muted-foreground mt-1">Your vibe space is ready</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200 cursor-pointer"
        >
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>
        <div className="h-9 w-9 rounded-xl bg-linear-to-br from-primary/80 to-primary/40 flex items-center justify-center text-xs font-bold text-primary-foreground cursor-pointer">
          A
        </div>
      </div>
    </header>
  );
}

export const DashboardHeader = memo(DashboardHeaderInner);
