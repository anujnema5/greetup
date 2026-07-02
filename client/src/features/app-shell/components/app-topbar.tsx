"use client";

import { memo, useCallback, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStartSpaceModal } from "@/features/spaces";
import { EXPLORE, DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import { PageHeaderToolbar } from "./page-header/page-header-toolbar";
import { SearchDropdownPortal } from "./search-dropdown-portal";

export type AppTopbarProps = {
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  searchPanel?: ReactNode;
  showStartSpace?: boolean;
};

function StartSpaceButton() {
  const { openModal } = useStartSpaceModal();

  return (
    <Button
      type="button"
      size="sm"
      className="hidden shrink-0 gap-1.5 rounded-full sm:inline-flex"
      onClick={openModal}
    >
      <Plus className="size-3.5" strokeWidth={2.25} aria-hidden />
      {DASHBOARD_SECTIONS.startSpace}
    </Button>
  );
}

function AppTopbarInner({
  searchQuery = "",
  onSearchQueryChange,
  searchPanel,
  showStartSpace = false,
}: AppTopbarProps) {
  const router = useRouter();
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const isInteractiveSearch = onSearchQueryChange != null;
  const hasQuery = searchQuery.trim().length > 0;
  const showDropdown = isInteractiveSearch && searchFocused && searchPanel != null && hasQuery;

  const goToExplore = useCallback(() => {
    router.push("/explore");
  }, [router]);

  const closeDropdown = useCallback(() => {
    setSearchFocused(false);
  }, []);

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div
        ref={searchAnchorRef}
        className={cn("relative max-w-[480px] flex-1", showDropdown && "z-50")}
      >
        <label
          className={cn(
            "flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3",
            "text-sm text-muted-foreground transition-colors duration-150",
            "focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-ring/20",
            !isInteractiveSearch && "cursor-text",
          )}
        >
          <Search className="size-[18px] shrink-0" aria-hidden />
          <span className="sr-only">{EXPLORE.searchPlaceholder}</span>
          <input
            type="search"
            readOnly={!isInteractiveSearch}
            value={isInteractiveSearch ? searchQuery : undefined}
            onChange={
              isInteractiveSearch
                ? (event) => onSearchQueryChange(event.target.value)
                : undefined
            }
            onFocus={isInteractiveSearch ? () => setSearchFocused(true) : goToExplore}
            onClick={!isInteractiveSearch ? goToExplore : undefined}
            placeholder={EXPLORE.searchPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className={cn(
              "w-full border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
              !isInteractiveSearch && "cursor-pointer",
            )}
          />
        </label>

        <SearchDropdownPortal
          open={showDropdown}
          onClose={closeDropdown}
          anchorRef={searchAnchorRef}
        >
          {searchPanel}
        </SearchDropdownPortal>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {showStartSpace ? <StartSpaceButton /> : null}
        <PageHeaderToolbar />
      </div>
    </div>
  );
}

export const AppTopbar = memo(AppTopbarInner);

export function AppTopbarShell({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-40 overflow-visible border-b border-border bg-background/95 backdrop-blur-md">
      <div className="w-full px-4 lg:px-5">{children}</div>
    </div>
  );
}
