CREATE TYPE "public"."activity_detail_mode" AS ENUM('none', 'language', 'topic', 'optional_topic');--> statement-breakpoint
CREATE TYPE "public"."match_intent" AS ENUM('quick', 'activity');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"emoji" varchar(20),
	"detail_mode" "activity_detail_mode" DEFAULT 'none' NOT NULL,
	"detail_label" varchar(120),
	"detail_max_length" integer DEFAULT 80 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "activities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "current_status_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"current_status_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"detail" varchar(120),
	"detail_normalized" varchar(120),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_status_activity" UNIQUE("current_status_id","activity_id")
);
--> statement-breakpoint
CREATE TABLE "room_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"detail" varchar(120),
	"detail_normalized" varchar(120),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_room_activity" UNIQUE("room_id","activity_id")
);
--> statement-breakpoint
ALTER TABLE "current_status" ADD COLUMN "match_intent" "match_intent" DEFAULT 'quick' NOT NULL;--> statement-breakpoint
ALTER TABLE "current_status_activities" ADD CONSTRAINT "current_status_activities_current_status_id_current_status_id_fk" FOREIGN KEY ("current_status_id") REFERENCES "public"."current_status"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_status_activities" ADD CONSTRAINT "current_status_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_activities" ADD CONSTRAINT "room_activities_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_activities" ADD CONSTRAINT "room_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activities_active_sort" ON "activities" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "idx_status_activities_status" ON "current_status_activities" USING btree ("current_status_id");--> statement-breakpoint
CREATE INDEX "idx_status_activities_activity" ON "current_status_activities" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "idx_room_activities_room" ON "room_activities" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_room_activities_activity" ON "room_activities" USING btree ("activity_id");
