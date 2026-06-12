-- Guest trial: profile flags + audit/abuse event log (see docs/temp/guest-trial-architecture.md)

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "is_guest" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "guest_trial_consumed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "guest_converted_at" timestamp;
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "guest_device_hash" text;
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "guest_created_ip_hash" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guest_trial_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"device_hash" text,
	"ip_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guest_trial_events_guest_user_id_users_id_fk" FOREIGN KEY ("guest_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_guest_trial_events_guest_user_id" ON "guest_trial_events" USING btree ("guest_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_guest_trial_events_event_type_created_at" ON "guest_trial_events" USING btree ("event_type", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_profiles_guest_device_hash" ON "user_profiles" USING btree ("guest_device_hash");
