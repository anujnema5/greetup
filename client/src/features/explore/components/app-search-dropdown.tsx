"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Search, Users, Video } from "lucide-react";

import { activeSpaceCardShowsLiveSession } from "@/features/spaces/lib/active-space-card-session-display";
import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";
import { nameInitials } from "@/lib/utils/name-initials";
import { cn } from "@/lib/utils";

import { APP_SEARCH_DROPDOWN_SECTION_LIMIT } from "../lib/app-search-filters";
import type { AppSearchDropdownProps } from "../types/app-search.types";

function SectionHeading({ label }: { label: string }) {
  return (
    <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
  );
}

function ResultRow({
  children,
  className,
  href,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const rowClass = cn(
    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={rowClass}>
      {children}
    </button>
  );
}

function PersonResult({
  displayName,
  username,
  image,
}: {
  displayName: string;
  username: string;
  image: string | null;
}) {
  return (
    <>
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-primary/70 to-primary text-xs font-bold text-primary-foreground">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          nameInitials(displayName)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">@{username}</p>
      </div>
    </>
  );
}

function SpaceResult({ space }: { space: ActiveSpaceItem }) {
  const isLive = activeSpaceCardShowsLiveSession(space);

  return (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/70 text-lg leading-none">
        {space.category.emoji ?? "○"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{space.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {isLive ? "Live now" : space.category.displayName}
        </p>
      </div>
      {isLive ? (
        <Video className="size-3.5 shrink-0 text-destructive" aria-hidden />
      ) : (
        <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </>
  );
}

/** Compact search results shown under the app topbar search field. */
export function AppSearchDropdown({
  query,
  debouncedQuery,
  minLength,
  canSearch,
  people,
  spaces,
  topics,
  isLoading,
  onSelectSpace,
  onSelectTopic,
}: AppSearchDropdownProps) {
  if (query.length > 0 && query.length < minLength) {
    return (
      <p className="px-3 py-4 text-center text-xs text-muted-foreground">
        Type at least {minLength} characters to search spaces, people, and topics.
      </p>
    );
  }

  if (!canSearch) {
    return null;
  }

  if (isLoading) {
    return <p className="px-3 py-6 text-center text-xs text-muted-foreground">Searching…</p>;
  }

  const visiblePeople = people.slice(0, APP_SEARCH_DROPDOWN_SECTION_LIMIT);
  const visibleSpaces = spaces.slice(0, APP_SEARCH_DROPDOWN_SECTION_LIMIT);
  const visibleTopics = topics.slice(0, APP_SEARCH_DROPDOWN_SECTION_LIMIT);
  const hasResults =
    visiblePeople.length > 0 || visibleSpaces.length > 0 || visibleTopics.length > 0;

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center px-3 py-8 text-muted-foreground">
        <Search size={22} className="mb-2 opacity-30" aria-hidden />
        <p className="text-sm">No results for &quot;{debouncedQuery}&quot;</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {visiblePeople.length > 0 ? (
        <section>
          <SectionHeading label="People" />
          {visiblePeople.map((person) => (
            <ResultRow
              key={person.userId}
              href={`/u/${encodeURIComponent(person.username)}`}
            >
              <PersonResult
                displayName={person.displayName || person.name}
                username={person.username}
                image={person.image}
              />
            </ResultRow>
          ))}
        </section>
      ) : null}

      {visibleSpaces.length > 0 ? (
        <section>
          <SectionHeading label="Spaces" />
          {visibleSpaces.map((space) => (
            <ResultRow key={space.id} onClick={() => onSelectSpace(space)}>
              <SpaceResult space={space} />
            </ResultRow>
          ))}
        </section>
      ) : null}

      {visibleTopics.length > 0 ? (
        <section>
          <SectionHeading label="Topics" />
          {visibleTopics.map((topic) => (
            <ResultRow key={topic.id} onClick={() => onSelectTopic(topic)}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/70 text-lg leading-none">
                {topic.emoji ?? "○"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{topic.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">Browse topic</p>
              </div>
            </ResultRow>
          ))}
        </section>
      ) : null}
    </div>
  );
}
