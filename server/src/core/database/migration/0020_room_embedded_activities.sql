CREATE TABLE "room_embedded_activities" (
  "slug" text PRIMARY KEY NOT NULL,
  "display_label" text NOT NULL,
  "emoji" varchar(32) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT false,
  "hide_people_tab" boolean NOT NULL DEFAULT false,
  "block_participant_invites" boolean NOT NULL DEFAULT false,
  "suppress_people_panel_cameras" boolean NOT NULL DEFAULT false,
  "invite_blocked_message" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "room_embedded_activities_active_sort_idx" ON "room_embedded_activities" ("is_active", "sort_order");
