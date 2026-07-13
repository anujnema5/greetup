CREATE TYPE "public"."connection_preference" AS ENUM('same_profession', 'different_profession', 'open_to_anyone');
--> statement-breakpoint
ALTER TABLE "current_status" ADD COLUMN "connection_preference" "connection_preference";
--> statement-breakpoint
CREATE TABLE "profile_match_prep_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"client_session_id" varchar(128) NOT NULL,
	"source" varchar(32) NOT NULL,
	"acknowledged_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_match_prep_session_profile_id_user_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "unique_profile_client_session" UNIQUE("profile_id","client_session_id")
);
--> statement-breakpoint
CREATE INDEX "idx_profile_match_prep_session_profile" ON "profile_match_prep_session" USING btree ("profile_id");
