export type OpenNowFeedFilter =
  | { kind: "all" }
  | { kind: "interest"; id: string }
  | { kind: "activity"; id: string };

export function openNowFilterKey(filter: OpenNowFeedFilter): string {
  if (filter.kind === "all") return "all";
  return `${filter.kind}:${filter.id}`;
}

export function openNowFilterQueryArgs(filter: OpenNowFeedFilter): {
  activityId?: string;
  interestId?: string;
} {
  if (filter.kind === "activity") return { activityId: filter.id };
  if (filter.kind === "interest") return { interestId: filter.id };
  return {};
}

export function isSameOpenNowFilter(a: OpenNowFeedFilter, b: OpenNowFeedFilter): boolean {
  return openNowFilterKey(a) === openNowFilterKey(b);
}
