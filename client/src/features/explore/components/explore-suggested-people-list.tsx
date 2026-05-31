"use client";

import type { RefObject } from "react";
import { useMemo } from "react";

import { usePeerConnectionRequestActions } from "@/features/connections/hooks/use-peer-connection-request-actions";
import { usePeersOnlineStatus } from "@/features/presence";
import { EXPLORE } from "@/lib/copy/user-messages";

import type { SuggestedPersonItem } from "../types/suggested-people.types";
import { ExploreSuggestedPersonRow } from "./explore-suggested-person-row";

type Props = {
  people: readonly SuggestedPersonItem[];
  canLoadMore: boolean;
  loadMoreSentinelRef: RefObject<HTMLDivElement | null>;
  showEndMessage: boolean;
};

export function ExploreSuggestedPeopleList({
  people,
  canLoadMore,
  loadMoreSentinelRef,
  showEndMessage,
}: Props) {
  const { getOutgoing, connect, withdraw, connectingUserId, withdrawingUserId } =
    usePeerConnectionRequestActions();

  const peerIds = useMemo(() => people.map((p) => p.userId), [people]);
  const { isOnline } = usePeersOnlineStatus(peerIds);

  return (
    <div className="flex flex-col gap-2">
      {people.map((person) => {
        const outgoing = getOutgoing(person.userId);
        const connectBusy = connectingUserId === person.userId;
        const withdrawBusy = withdrawingUserId === person.userId;

        return (
          <ExploreSuggestedPersonRow
            key={person.userId}
            person={person}
            isOnline={isOnline(person.userId)}
            outgoing={outgoing}
            connectBusy={connectBusy}
            withdrawBusy={withdrawBusy}
            onConnect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void connect({ userId: person.userId, username: person.username });
            }}
            onWithdraw={(e, connectionId) => {
              e.preventDefault();
              e.stopPropagation();
              void withdraw({ userId: person.userId, username: person.username }, connectionId);
            }}
          />
        );
      })}

      <div
        ref={loadMoreSentinelRef}
        className="min-h-px"
        aria-hidden={!canLoadMore}
      />

      {showEndMessage && (
        <p className="text-center text-xs text-muted-foreground py-3">
          {EXPLORE.peopleLikeYou.endOfList}
        </p>
      )}
    </div>
  );
}
