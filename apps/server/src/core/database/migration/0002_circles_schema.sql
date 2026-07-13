CREATE TYPE "public"."circle_participant_role" AS ENUM('host', 'participant');--> statement-breakpoint
CREATE TYPE "public"."circle_status" AS ENUM('scheduled', 'live', 'ended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."circle_visibility" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TABLE "circle_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "circle_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "circle_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "circle_participant_role" DEFAULT 'participant' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"host_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"visibility" "circle_visibility" DEFAULT 'private' NOT NULL,
	"max_participants" integer NOT NULL,
	"scheduled_start_at" timestamp,
	"scheduled_end_at" timestamp,
	"status" "circle_status" DEFAULT 'scheduled' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"rtc_room_id" text,
	"invite_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "circles_max_participants_bounds" CHECK (max_participants >= 2 AND max_participants <= 100)
);
--> statement-breakpoint
ALTER TABLE "circle_participants" ADD CONSTRAINT "circle_participants_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_participants" ADD CONSTRAINT "circle_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circles" ADD CONSTRAINT "circles_category_id_circle_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."circle_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circles" ADD CONSTRAINT "circles_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "circle_categories_active_sort_idx" ON "circle_categories" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "circle_participants_circle_user_unique" ON "circle_participants" USING btree ("circle_id","user_id");--> statement-breakpoint
CREATE INDEX "circle_participants_user_id_idx" ON "circle_participants" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "circles_invite_code_unique" ON "circles" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "circles_category_id_idx" ON "circles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "circles_host_user_id_idx" ON "circles" USING btree ("host_user_id");--> statement-breakpoint
CREATE INDEX "circles_status_scheduled_start_idx" ON "circles" USING btree ("status","scheduled_start_at");--> statement-breakpoint
CREATE INDEX "circles_visibility_status_idx" ON "circles" USING btree ("visibility","status");