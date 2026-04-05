import Link from "next/link";
import { Search } from "lucide-react";

import { nameInitials } from "@/lib/utils/name-initials";
import { cn } from "@/lib/utils";

import type { SearchUserItem } from "../types/user-search.types";

type Props = {
  results: SearchUserItem[];
  isLoading: boolean;
  queryLabel: string;
};

export function ExploreUserSearchResults({ results, isLoading, queryLabel }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {isLoading && (
        <p className="text-xs text-muted-foreground py-4 text-center">Searching…</p>
      )}

      {!isLoading &&
        results.map((p) => (
          <Link
            key={p.userId}
            href={`/u/${encodeURIComponent(p.username)}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors duration-150"
          >
            <div className="relative shrink-0">
              <div
                className={cn(
                  "h-10 w-10 rounded-full bg-linear-to-br from-primary/70 to-primary flex items-center justify-center text-xs font-bold text-primary-foreground overflow-hidden",
                )}
              >
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  nameInitials(p.displayName || p.name)
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {p.displayName || p.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
            </div>

            <span className="text-[11px] font-medium text-primary shrink-0">View</span>
          </Link>
        ))}

      {!isLoading && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Search size={28} className="mb-2 opacity-30" aria-hidden />
          <p className="text-sm">No people match &quot;{queryLabel}&quot;</p>
        </div>
      )}
    </div>
  );
}
