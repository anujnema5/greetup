CREATE TYPE "public"."circle_friend_invite_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled');--> statement-breakpoint
CREATE TABLE "circle_friend_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"inviter_user_id" text NOT NULL,
	"invitee_user_id" text NOT NULL,
	"status" "circle_friend_invite_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "circle_friend_invites_no_self" CHECK (inviter_user_id <> invitee_user_id)
);
--> statement-breakpoint
ALTER TABLE "circle_friend_invites" ADD CONSTRAINT "circle_friend_invites_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_friend_invites" ADD CONSTRAINT "circle_friend_invites_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_friend_invites" ADD CONSTRAINT "circle_friend_invites_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "circle_friend_invites_circle_invitee_unique" ON "circle_friend_invites" USING btree ("circle_id","invitee_user_id");--> statement-breakpoint
CREATE INDEX "circle_friend_invites_invitee_idx" ON "circle_friend_invites" USING btree ("invitee_user_id");--> statement-breakpoint
CREATE INDEX "circle_friend_invites_circle_idx" ON "circle_friend_invites" USING btree ("circle_id");