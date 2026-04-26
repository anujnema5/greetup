import type { RoomChessLastOutcome } from "@/lib/redux/types/activity-slice.types";

export type ChessOutcomePresentation =
  | {
      kind: "decisive";
      headline: string;
      reason: string;
      winnerName: string;
      loserName: string;
      youWon: boolean;
    }
  | {
      kind: "draw";
      headline: string;
      reason: string;
      whiteName: string;
      blackName: string;
    };

function labelFor(
  userId: string,
  me: string | null,
  myDisplayName: string,
  peerDisplayName: string,
): string {
  if (me && userId === me) return myDisplayName;
  return peerDisplayName;
}

export function buildChessOutcomePresentation(
  outcome: RoomChessLastOutcome,
  me: string | null,
  myDisplayName: string,
  peerDisplayName: string,
): ChessOutcomePresentation {
  const label = (uid: string) => labelFor(uid, me, myDisplayName, peerDisplayName);

  if (outcome.result === "draw" || outcome.result === "stalemate") {
    return {
      kind: "draw",
      headline: "Draw",
      reason:
        outcome.result === "stalemate"
          ? "Stalemate — neither side can win."
          : "Agreed draw — shared result.",
      whiteName: label(outcome.whiteUserId),
      blackName: label(outcome.blackUserId),
    };
  }

  if (outcome.result === "resign") {
    const loserId = outcome.endedByUserId;
    const winnerId =
      outcome.whiteUserId === loserId ? outcome.blackUserId : outcome.whiteUserId;
    const winnerName = label(winnerId);
    const loserName = label(loserId);
    const youWon = Boolean(me && winnerId === me);
    return {
      kind: "decisive",
      headline: youWon ? "You won" : `${winnerName} wins`,
      reason: loserId === me ? "You resigned" : `${loserName} resigned`,
      winnerName,
      loserName,
      youWon,
    };
  }

  const winnerId = outcome.winnerUserId;
  if (!winnerId) {
    return {
      kind: "draw",
      headline: "Game over",
      reason: "Checkmate",
      whiteName: label(outcome.whiteUserId),
      blackName: label(outcome.blackUserId),
    };
  }

  const loserId =
    outcome.whiteUserId === winnerId ? outcome.blackUserId : outcome.whiteUserId;
  const winnerName = label(winnerId);
  const loserName = label(loserId);
  const youWon = Boolean(me && winnerId === me);

  return {
    kind: "decisive",
    headline: youWon ? "You won" : `${winnerName} wins`,
    reason: "Checkmate",
    winnerName,
    loserName,
    youWon,
  };
}
