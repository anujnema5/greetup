ALTER TABLE "activities" ADD COLUMN "detail_placeholder" varchar(120);--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "current_status_activities" ADD COLUMN "sort_order" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "room_activities" ADD COLUMN "sort_order" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "chk_activities_detail_required_mode" CHECK (NOT "detail_required" OR "detail_mode" <> 'none');--> statement-breakpoint
CREATE INDEX "idx_activities_match_prep_catalog" ON "activities" USING btree ("sort_order") WHERE "is_active" = true AND "allow_in_match_prep" = true;--> statement-breakpoint
CREATE INDEX "idx_activities_space_catalog" ON "activities" USING btree ("sort_order") WHERE "is_active" = true AND "allow_in_space" = true;
