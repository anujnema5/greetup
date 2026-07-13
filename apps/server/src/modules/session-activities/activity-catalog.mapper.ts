import type { ActivityCatalogRow, ActivityOptionDto, SpaceActivityTagDto } from "./types";

export function toActivityOptionDto(row: ActivityCatalogRow): ActivityOptionDto {
  return {
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    emoji: row.emoji,
    detailMode: row.detailMode,
    detailLabel: row.detailLabel,
    detailPlaceholder: row.detailPlaceholder,
    detailMaxLength: row.detailMaxLength,
    detailRequired: row.detailRequired,
  };
}

export function toActivityOptionDtos(rows: ActivityCatalogRow[]): ActivityOptionDto[] {
  return rows.map(toActivityOptionDto);
}

export function toSpaceActivityTagDto(row: {
  detail: string | null;
  activity: {
    id: string;
    name: string;
    displayName: string;
    emoji: string | null;
  };
}): SpaceActivityTagDto {
  return {
    activityId: row.activity.id,
    name: row.activity.name,
    displayName: row.activity.displayName,
    emoji: row.activity.emoji,
    detail: row.detail?.trim() || null,
  };
}
