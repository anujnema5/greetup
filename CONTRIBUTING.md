# Contributing

## AI-assisted editing (Cursor, Claude, etc.)

It is fine to use AI tools to draft or refactor code. Treat the result like any other change:

- **You** are responsible for correctness, security, and behavior. Review diffs before committing.
- Run **`typecheck` / `lint` / tests** for the packages you touched (see root `README.md` command tables).
- Do **not** commit secrets, `.env` files, or credentials. AI suggestions may hallucinate env var names—verify against each service’s `.env.example`.
- **No need** to add “written by Claude” (or similar) banners in source files. Optional: mention AI assistance in a PR description if your team cares for audit trails.

## What we expect in changes

- Match **existing style** in the nearest files (imports, naming, error handling).
- Prefer **small, focused PRs** with a clear description of user-visible or protocol behavior.
- Update **docs** when you change public behavior (APIs, Socket events, Redis keys, env vars). See `docs/README.md`.

## Security

- Never log tokens, cookies, or full JWT payloads.
- WebRTC and signaling changes should be reviewed with care (authz, room membership).

## Questions

Use your team’s usual channel. Internal architecture pointers: `docs/README.md`.
