# Circles feature

API, start-circle modal, dashboard preview grid, and full browse page.

## Folder map

| Folder | Purpose |
|--------|---------|
| `api/` | RTK Query — categories, active list, browse infinite query, create/update |
| `components/` | Shared UI (cards, grid, start-circle modal) |
| `components/browse/` | `/circles` page only — header, tabs, sections |
| `constants/` | Copy — `start-circle-copy.ts`, `circles-browse-copy.ts` |
| `hooks/` | `use-start-circle-modal-state`, browse data, shared card actions |
| `lib/` | Dedupe, browse path, parse infinite pages, card session display |
| `pages/` | Route shells (`circles-page.tsx`) |
| `schemas/` | Zod form for start / edit circle |
| `types/` | API DTOs, browse tab types, start-circle UI types |

## Routes

| Path | Entry |
|------|--------|
| `/circles` | `pages/circles-page.tsx` → `CirclesBrowseView` |
| Home grid | `components/circles-grid.tsx` — preview + “View all” → `/circles` |

## Browse data flow

1. `useCirclesBrowseData` — `browseActiveCircles` infinite query
2. `parseBrowseCirclePages` — first page = invited + joined; all pages = public discover (deduped)
3. `useActiveCircleCardActions` — join room, edit schedule, start now (grid + browse)
4. `useCircleListBadges` — Invited / Joined badges on cards
