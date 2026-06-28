"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppSearchDropdown } from "@/features/explore/components/app-search-dropdown";
import { ExploreNicheRoomsModal } from "@/features/explore/components/explore-niche-rooms-modal";
import { useAppSearch } from "@/features/explore/hooks/use-app-search";
import { useExploreNicheRoomsModal } from "@/features/explore/hooks/use-explore-niche-rooms-modal";
import { useJoinSpace } from "@/features/spaces/hooks/use-join-space";
import { APP_SHELL, EXPLORE } from "@/lib/copy/user-messages";

import { useAppSearchPalette } from "../context/app-search-palette-context";

export function AppSearchPaletteDialog() {
  const { open, closePalette } = useAppSearchPalette();
  const { query, setQuery, results } = useAppSearch();
  const topicModal = useExploreNicheRoomsModal();
  const joinSpace = useJoinSpace();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, setQuery]);

  const handleOpenChange = (next: boolean) => {
    if (!next) closePalette();
  };

  const handleResultActivate = () => {
    closePalette();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-lg [&_[data-slot=dialog-close]]:top-3 [&_[data-slot=dialog-close]]:right-3"
          showCloseButton
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{APP_SHELL.searchPalette.title}</DialogTitle>
            <DialogDescription>{APP_SHELL.searchPalette.description}</DialogDescription>
          </DialogHeader>

          <label className="flex h-12 items-center gap-2 border-b border-border pr-12 pl-3">
            <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              role="searchbox"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={EXPLORE.searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
              aria-label={EXPLORE.searchPlaceholder}
              className="min-w-0 flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>

          <div className="max-h-[min(420px,60vh)] overflow-y-auto overscroll-contain">
            {query.trim().length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {APP_SHELL.searchPalette.emptyHint}
              </p>
            ) : (
              <AppSearchDropdown
                {...results}
                onSelectSpace={joinSpace}
                onSelectTopic={topicModal.openForNiche}
                onResultActivate={handleResultActivate}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ExploreNicheRoomsModal
        niche={topicModal.selectedNiche}
        open={topicModal.open}
        onOpenChange={(next) => {
          if (!next) topicModal.close();
        }}
        rooms={topicModal.rooms}
        isLoading={topicModal.isLoading}
        isLoadingMore={topicModal.isLoadingMore}
        isError={topicModal.isError}
        hasMore={topicModal.hasMore}
        onLoadMore={topicModal.loadMore}
      />
    </>
  );
}
