"use client";

import type { RefObject } from "react";

import { usePeerConnectionRequestActions } from "@/features/connections/hooks/use-peer-connection-request-actions";
import { usePeersOnlineStatus } from "@/features/presence";
import { EXPLORE } from "@/lib/copy/user-messages";

import type { SuggestedPersonItem } from "../types/suggested-people.types";
import { ExploreSuggestedPersonCard } from "./explore-suggested-person-card";

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

  const peerIds = people.map((p) => p.userId);
  const { isOnline } = usePeersOnlineStatus(peerIds);

  return (
    <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((person) => {
        const outgoing = getOutgoing(person.userId);
        const connectBusy = connectingUserId === person.userId;
        const withdrawBusy = withdrawingUserId === person.userId;

        return (
          <ExploreSuggestedPersonCard
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
        className="col-span-full min-h-px"
        aria-hidden={!canLoadMore}
      />

      {showEndMessage ? (
        <p className="col-span-full py-2 text-center text-xs text-muted-foreground">
          {EXPLORE.peopleLikeYou.endOfList}
        </p>
      ) : null}
    </div>
  );
}
