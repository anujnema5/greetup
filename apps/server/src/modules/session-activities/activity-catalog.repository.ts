import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/core/database";
import { activities } from "@/core/database/schema";

import { ActivitySelectionValidationError } from "./activity-selection.errors";
import {
  MAX_MATCH_PREP_ACTIVITY_SELECTIONS,
  MAX_SPACE_ACTIVITY_SELECTIONS,
} from "./constants";
import { normalizeActivityDetail, trimActivityDetail } from "./normalize-detail";
import type {
  ActivityCatalogRow,
  ActivitySelectionContext,
  ActivitySelectionInput,
  ValidatedActivitySelection,
} from "./types";

const catalogColumns = {
  id: true,
  name: true,
  displayName: true,
  description: true,
  emoji: true,
  detailMode: true,
  detailLabel: true,
  detailPlaceholder: true,
  detailMaxLength: true,
  sortOrder: true,
  allowInMatchPrep: true,
  allowInSpace: true,
  detailRequired: true,
} as const;

function isAllowedInContext(
  row: ActivityCatalogRow,
  context: ActivitySelectionContext,
): boolean {
  return context === "space" ? row.allowInSpace : row.allowInMatchPrep;
}

function maxSelectionsForContext(context: ActivitySelectionContext): number {
  return context === "space"
    ? MAX_SPACE_ACTIVITY_SELECTIONS
    : MAX_MATCH_PREP_ACTIVITY_SELECTIONS;
}

export const activityCatalogRepository = {
  async listActiveCatalog(context?: ActivitySelectionContext): Promise<ActivityCatalogRow[]> {
    const rows = await db.query.activities.findMany({
      where: eq(activities.isActive, true),
      columns: catalogColumns,
      orderBy: [asc(activities.sortOrder), asc(activities.displayName)],
    });

    if (context === "match_prep") {
      return rows.filter((r) => r.allowInMatchPrep);
    }
    if (context === "space") {
      return rows.filter((r) => r.allowInSpace);
    }
    return rows;
  },

  async findActiveByIds(ids: string[]): Promise<ActivityCatalogRow[]> {
    if (ids.length === 0) return [];
    return db.query.activities.findMany({
      where: and(inArray(activities.id, ids), eq(activities.isActive, true)),
      columns: catalogColumns,
    });
  },

  validateSelectionCount(
    selections: ActivitySelectionInput[] | undefined,
    options: {
      context: ActivitySelectionContext;
      matchIntent?: "quick" | "activity";
      maxCount?: number;
    },
  ): ActivitySelectionInput[] {
    const input = selections ?? [];
    const maxCount = options.maxCount ?? maxSelectionsForContext(options.context);
    const requireAtLeastOne =
      options.context === "match_prep" && options.matchIntent === "activity";

    if (requireAtLeastOne && input.length === 0) {
      throw new ActivitySelectionValidationError(
        "Pick at least one activity",
        "ACTIVITY_REQUIRED",
      );
    }

    if (input.length > maxCount) {
      throw new ActivitySelectionValidationError(
        `You can pick at most ${maxCount} activities`,
        "ACTIVITY_INVALID",
      );
    }

    const seen = new Set<string>();
    for (const row of input) {
      if (seen.has(row.activityId)) {
        throw new ActivitySelectionValidationError(
          "Duplicate activity selected",
          "ACTIVITY_DUPLICATE",
        );
      }
      seen.add(row.activityId);
    }

    return input;
  },

  async validateSelectionsAgainstCatalog(
    selections: ActivitySelectionInput[] | undefined,
    options: {
      context: ActivitySelectionContext;
      matchIntent?: "quick" | "activity";
      maxCount?: number;
    },
  ): Promise<ValidatedActivitySelection[]> {
    const input = this.validateSelectionCount(selections, options);
    if (input.length === 0) return [];

    const catalogRows = await this.findActiveByIds(input.map((s) => s.activityId));
    const byId = new Map(catalogRows.map((r) => [r.id, r]));

    return input.map((sel, sortOrder) => {
      const catalog = byId.get(sel.activityId);
      if (!catalog) {
        throw new ActivitySelectionValidationError(
          "Unknown or inactive activity",
          "ACTIVITY_INVALID",
        );
      }

      if (!isAllowedInContext(catalog, options.context)) {
        throw new ActivitySelectionValidationError(
          `${catalog.displayName} is not available here`,
          "ACTIVITY_NOT_ALLOWED",
        );
      }

      const detail = trimActivityDetail(sel.detail);

      if (catalog.detailRequired && !detail) {
        throw new ActivitySelectionValidationError(
          `${catalog.displayName}: ${catalog.detailLabel ?? "detail"} is required`,
          "ACTIVITY_DETAIL_REQUIRED",
        );
      }

      if (detail && detail.length > catalog.detailMaxLength) {
        throw new ActivitySelectionValidationError(
          `${catalog.displayName}: detail is too long`,
          "ACTIVITY_DETAIL_TOO_LONG",
        );
      }

      return {
        activityId: sel.activityId,
        detail,
        detailNormalized: detail ? normalizeActivityDetail(detail) : null,
        sortOrder,
      };
    });
  },
};
