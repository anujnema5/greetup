-- Rename legacy advanced_options JSON keys stored on rooms.
UPDATE "rooms"
SET "advanced_options" = "advanced_options"
  - 'circleExpirationMinutes'
  || CASE
    WHEN "advanced_options" ? 'circleExpirationMinutes'
    THEN jsonb_build_object(
      'spaceExpirationMinutes',
      "advanced_options"->'circleExpirationMinutes'
    )
    ELSE '{}'::jsonb
  END
WHERE "advanced_options" ? 'circleExpirationMinutes';--> statement-breakpoint

UPDATE "rooms"
SET "advanced_options" = "advanced_options"
  - 'deleteCircleAfterCall'
  || CASE
    WHEN "advanced_options" ? 'deleteCircleAfterCall'
    THEN jsonb_build_object(
      'deleteSpaceAfterCall',
      "advanced_options"->'deleteCircleAfterCall'
    )
    ELSE '{}'::jsonb
  END
WHERE "advanced_options" ? 'deleteCircleAfterCall';
