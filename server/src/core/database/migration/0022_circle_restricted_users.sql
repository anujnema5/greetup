CREATE TABLE IF NOT EXISTS "circle_restricted_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"restricted_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "circle_restricted_users" ADD CONSTRAINT "circle_restricted_users_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "circle_restricted_users" ADD CONSTRAINT "circle_restricted_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "circle_restricted_users" ADD CONSTRAINT "circle_restricted_users_restricted_by_user_id_users_id_fk" FOREIGN KEY ("restricted_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "circle_restricted_users_room_user_unique" ON "circle_restricted_users" USING btree ("room_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "circle_restricted_users_room_id_idx" ON "circle_restricted_users" USING btree ("room_id");
