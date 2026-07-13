ALTER TABLE "activities" ADD COLUMN "allow_in_match_prep" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "allow_in_space" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "detail_required" boolean DEFAULT false NOT NULL;
