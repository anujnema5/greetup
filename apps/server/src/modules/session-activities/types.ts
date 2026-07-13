export type ActivityDetailMode = "none" | "language" | "topic" | "optional_topic";

/** Where validated selections may be persisted. */
export type ActivitySelectionContext = "match_prep" | "space";

export type ActivitySelectionInput = {
  activityId: string;
  detail?: string | null;
};

export type ValidatedActivitySelection = {
  activityId: string;
  detail: string | null;
  detailNormalized: string | null;
  /** Preserves client pick order (0 = primary activity). */
  sortOrder: number;
};

export type ActivityCatalogRow = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  emoji: string | null;
  detailMode: ActivityDetailMode;
  detailLabel: string | null;
  detailPlaceholder: string | null;
  detailMaxLength: number;
  sortOrder: number;
  allowInMatchPrep: boolean;
  allowInSpace: boolean;
  detailRequired: boolean;
};

/** API option row returned to clients for pickers. */
export type ActivityOptionDto = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  emoji: string | null;
  detailMode: ActivityDetailMode;
  detailLabel: string | null;
  detailPlaceholder: string | null;
  detailMaxLength: number;
  detailRequired: boolean;
};

/** Tagged activity on a space listing. */
export type SpaceActivityTagDto = {
  activityId: string;
  name: string;
  displayName: string;
  emoji: string | null;
  detail: string | null;
};
