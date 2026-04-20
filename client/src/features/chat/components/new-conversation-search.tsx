'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetMyConnectionsQuery } from '@/features/connections/api/connections-api';
import { useCreateConnectionConversationMutation } from '../api/chat-api';
import type { Conversation } from '../types/chat.types';

interface NewConversationSearchProps {
  onConversationOpen: (conv: Conversation) => void;
}

export function NewConversationSearch({ onConversationOpen }: NewConversationSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useGetMyConnectionsQuery(
    { filter: 'accepted', q: query, limit: 10 },
    { skip: !open },
  );

  const [createConversation, { isLoading: isCreating }] = useCreateConnectionConversationMutation();

  const friends = data?.data?.items ?? [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSelect(targetUserId: string) {
    try {
      const conv = await createConversation({ targetUserId }).unwrap();
      onConversationOpen(conv);
      setQuery('');
      setOpen(false);
    } catch {
      // ignore – error already handled by RTK
    }
  }

  return (
    <div ref={containerRef} className="relative border-b border-border/60 px-3 py-2.5 md:py-2">
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <Input
          type="text"
          placeholder="Search connections…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          className="h-auto w-full rounded-xl border-border/60 bg-muted/80 py-2 pl-8 pr-3 text-xs focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => { setQuery(''); setOpen(false); }}
            className="absolute right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 p-0 text-muted-foreground hover:text-foreground"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Button>
        )}
      </div>

      {open && (
        <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-50 rounded-lg border bg-popover shadow-lg overflow-hidden">
          {isFetching && (
            <div className="flex flex-col gap-1.5 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                </div>
              ))}
            </div>
          )}

          {!isFetching && friends.length === 0 && (
            <div className="px-3 py-4 text-xs text-center text-muted-foreground">
              {query ? 'No connections found' : 'Start typing to search connections'}
            </div>
          )}

          {!isFetching && friends.length > 0 && (
            <ul className="py-1 max-h-56 overflow-y-auto">
              {friends.map((item) => {
                const display = item.peer.displayName ?? item.peer.name;
                const initials = display
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase();

                return (
                  <li key={item.connectionId}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isCreating}
                      onClick={() => handleSelect(item.peer.userId)}
                      className="h-auto w-full justify-start gap-2.5 rounded-none px-3 py-2 text-left text-sm hover:bg-muted/60"
                    >
                      {item.peer.image ? (
                        <Image
                          src={item.peer.image}
                          alt={display}
                          width={28}
                          height={28}
                          className="h-7 w-7 shrink-0 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{display}</p>
                        {item.peer.username && (
                          <p className="text-[10px] text-muted-foreground truncate">@{item.peer.username}</p>
                        )}
                      </div>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
