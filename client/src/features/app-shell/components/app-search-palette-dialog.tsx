"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

import {
  FormSheet,
  FormSheetDescription,
  FormSheetHeader,
  FormSheetTitle,
} from "@/components/ui/form-sheet";
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
      <FormSheet
        open={open}
        onOpenChange={handleOpenChange}
        showCloseButton
        contentClassName="sm:max-w-lg"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <FormSheetHeader className="sr-only">
          <FormSheetTitle>{APP_SHELL.searchPalette.title}</FormSheetTitle>
          <FormSheetDescription>
            {APP_SHELL.searchPalette.description}
          </FormSheetDescription>
        </FormSheetHeader>

        <label className="flex h-12 shrink-0 items-center gap-2 border-b border-border pr-12 pl-3">
          <Search
            className="size-[18px] shrink-0 text-muted-foreground"
            aria-hidden
          />
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
            className="min-w-0 flex-1 border-none bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
          />
        </label>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
      </FormSheet>

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
