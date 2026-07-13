CREATE TYPE "public"."room_type" AS ENUM('direct', 'circle');--> statement-breakpoint
ALTER TABLE "circles" RENAME TO "rooms";--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "room_type" "room_type" DEFAULT 'circle' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" RENAME CONSTRAINT "circles_max_participants_bounds" TO "rooms_max_participants_bounds";--> statement-breakpoint
ALTER TABLE "rooms" RENAME CONSTRAINT "circles_category_id_circle_categories_id_fk" TO "rooms_category_id_circle_categories_id_fk";--> statement-breakpoint
ALTER TABLE "rooms" RENAME CONSTRAINT "circles_host_user_id_users_id_fk" TO "rooms_host_user_id_users_id_fk";--> statement-breakpoint
ALTER INDEX "circles_invite_code_unique" RENAME TO "rooms_invite_code_unique";--> statement-breakpoint
ALTER INDEX "circles_category_id_idx" RENAME TO "rooms_category_id_idx";--> statement-breakpoint
ALTER INDEX "circles_host_user_id_idx" RENAME TO "rooms_host_user_id_idx";--> statement-breakpoint
ALTER INDEX "circles_status_scheduled_start_idx" RENAME TO "rooms_status_scheduled_start_idx";--> statement-breakpoint
ALTER INDEX "circles_visibility_status_idx" RENAME TO "rooms_visibility_status_idx";--> statement-breakpoint
ALTER TABLE "circle_participants" RENAME COLUMN "circle_id" TO "room_id";--> statement-breakpoint
ALTER TABLE "circle_participants" RENAME TO "room_participants";--> statement-breakpoint
ALTER TABLE "room_participants" RENAME CONSTRAINT "circle_participants_circle_id_circles_id_fk" TO "room_participants_room_id_rooms_id_fk";--> statement-breakpoint
ALTER TABLE "room_participants" RENAME CONSTRAINT "circle_participants_user_id_users_id_fk" TO "room_participants_user_id_users_id_fk";--> statement-breakpoint
ALTER INDEX "circle_participants_circle_user_unique" RENAME TO "room_participants_room_user_unique";--> statement-breakpoint
ALTER INDEX "circle_participants_user_id_idx" RENAME TO "room_participants_user_id_idx";--> statement-breakpoint
ALTER TABLE "circle_friend_invites" RENAME COLUMN "circle_id" TO "room_id";--> statement-breakpoint
ALTER TABLE "circle_friend_invites" RENAME TO "room_friend_invites";--> statement-breakpoint
ALTER TABLE "room_friend_invites" RENAME CONSTRAINT "circle_friend_invites_circle_id_circles_id_fk" TO "room_friend_invites_room_id_rooms_id_fk";--> statement-breakpoint
ALTER TABLE "room_friend_invites" RENAME CONSTRAINT "circle_friend_invites_inviter_user_id_users_id_fk" TO "room_friend_invites_inviter_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "room_friend_invites" RENAME CONSTRAINT "circle_friend_invites_invitee_user_id_users_id_fk" TO "room_friend_invites_invitee_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "room_friend_invites" RENAME CONSTRAINT "circle_friend_invites_no_self" TO "room_friend_invites_no_self";--> statement-breakpoint
ALTER INDEX "circle_friend_invites_circle_invitee_unique" RENAME TO "room_friend_invites_room_invitee_unique";--> statement-breakpoint
ALTER INDEX "circle_friend_invites_invitee_idx" RENAME TO "room_friend_invites_invitee_idx";--> statement-breakpoint
ALTER INDEX "circle_friend_invites_circle_idx" RENAME TO "room_friend_invites_room_idx";--> statement-breakpoint
