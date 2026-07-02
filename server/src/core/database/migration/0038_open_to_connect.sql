CREATE TYPE "public"."open_to_connect_source" AS ENUM('manual', 'post_no_match');--> statement-breakpoint
CREATE TYPE "public"."connect_request_status" AS ENUM('pending', 'accepted', 'rejected', 'expired', 'cancelled');--> statement-breakpoint
ALTER TABLE "current_status" ADD COLUMN "open_to_connect" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "current_status" ADD COLUMN "open_to_connect_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "current_status" ADD COLUMN "open_to_connect_source" "open_to_connect_source";--> statement-breakpoint
ALTER TABLE "current_status" ADD COLUMN "open_to_connect_headline" varchar(120);--> statement-breakpoint
CREATE TABLE "connect_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_user_id" text NOT NULL,
	"target_user_id" text NOT NULL,
	"status" "connect_request_status" DEFAULT 'pending' NOT NULL,
	"message" varchar(280),
	"match_score_snapshot" integer,
	"room_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "connect_requests_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "connect_requests_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "connect_requests_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "connect_requests_no_self" CHECK ("requester_user_id" <> "target_user_id")
);
--> statement-breakpoint
CREATE INDEX "idx_connect_requests_target_status" ON "connect_requests" USING btree ("target_user_id","status");--> statement-breakpoint
CREATE INDEX "idx_connect_requests_requester_created" ON "connect_requests" USING btree ("requester_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_connect_requests_pending_pair" ON "connect_requests" USING btree ("requester_user_id","target_user_id") WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_current_status_open_to_connect" ON "current_status" USING btree ("open_to_connect") WHERE "open_to_connect" = true;
