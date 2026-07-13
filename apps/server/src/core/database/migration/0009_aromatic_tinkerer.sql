-- No-op: `drizzle-kit generate` produced this migration from an older baseline (circle_* tables)
-- while the repo already applies the same schema evolution incrementally in 0006–0008.
-- Running the generated DDL would duplicate CREATE TYPE / renames / constraints and fail on real DBs.
-- Keep this file so the migration journal stays ordered and `drizzle-kit migrate` records 0009 as applied.

SELECT 1;
