ALTER TABLE "rooms" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "is_expired" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "rooms" AS r
SET
  "expires_at" = v.deadline,
  "is_expired" = (v.deadline IS NOT NULL AND v.deadline < now())
FROM (
  SELECT
    r2.id AS rid,
    (
      SELECT MIN(u.z)
      FROM unnest(
        ARRAY[
          r2.scheduled_end_at,
          CASE
            WHEN r2.status = 'scheduled'
              AND r2.scheduled_start_at IS NOT NULL
              AND COALESCE((r2.advanced_options->>'circleExpirationMinutes')::int, 0) > 0
            THEN r2.scheduled_start_at + (
              COALESCE((r2.advanced_options->>'circleExpirationMinutes')::int, 0)
              * interval '1 minute'
            )
            ELSE NULL::timestamptz
          END
        ]::timestamptz[]
      ) AS u(z)
      WHERE u.z IS NOT NULL
    ) AS deadline
  FROM "rooms" AS r2
  WHERE r2.room_type = 'circle'
) AS v
WHERE r.id = v.rid AND r.room_type = 'circle';
