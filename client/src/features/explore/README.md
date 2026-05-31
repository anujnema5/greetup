# Explore feature

Search people, browse niches (live + scheduled circles), and “People like you” suggestions.

## Folder map

| Folder | Purpose |
|--------|---------|
| `api/` | RTK Query — user search, suggested people, browse niches + niche rooms |
| `components/` | UI sections, rows, modals (presentational + thin wiring) |
| `constants/` | Page sizes, niche card gradients |
| `hooks/` | Data fetching, scroll, modal state, local search |
| `lib/` | Display helpers (labels, filters, room grouping) |
| `pages/` | `explore-page.tsx` — composes sections only |
| `types/` | API response shapes |

## Data flow

| Section | Hook | API |
|---------|------|-----|
| Browse by niche | `useExploreBrowseNiches` | `GET /circles/browse/niches` |
| Niche modal | `useExploreNicheRoomsModal` | `GET /circles/browse/niches/:id/rooms` |
| People like you | `useExploreSuggestedPeople` | `GET /search/suggested-people` |
| Directory search | `useSearchUsersQuery` + `useExploreSearch` | `GET /search/users` |

Shared actions: `useJoinCircle` (circles), `usePeerConnectionRequestActions` (connections).

Copy lives in `client/src/lib/copy/user-messages.ts` under `EXPLORE`.
