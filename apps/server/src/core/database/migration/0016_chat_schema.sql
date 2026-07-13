CREATE TYPE "public"."conversation_type" AS ENUM('room_direct', 'room_circle', 'connection');
--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'video', 'file', 'voice', 'gif', 'system');
--> statement-breakpoint
CREATE TYPE "public"."chat_media_type" AS ENUM('image', 'video', 'file', 'voice', 'gif');
--> statement-breakpoint

CREATE TABLE "conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" "conversation_type" NOT NULL,
  "room_id" uuid,
  "connection_id" uuid,
  "is_persisted" boolean NOT NULL DEFAULT false,
  "parent_conversation_id" uuid,
  "expanded_at" timestamp,
  "expanded_by_user_id" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "conversations_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "conversations_connection_id_user_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."user_connections"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "conversations_expanded_by_user_id_users_id_fk" FOREIGN KEY ("expanded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint

CREATE TABLE "conversation_participants" (
  "conversation_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "wants_persistence" boolean NOT NULL DEFAULT true,
  "last_read_message_id" uuid,
  "last_read_at" timestamp,
  "joined_from_message_id" uuid,
  "joined_at" timestamp NOT NULL DEFAULT now(),
  "left_at" timestamp,
  CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "user_id"),
  CONSTRAINT "conversation_participants_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "conversation_participants_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint

CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "sender_id" text NOT NULL,
  "encrypted_content" text NOT NULL,
  "iv" text NOT NULL,
  "message_type" "message_type" NOT NULL DEFAULT 'text',
  "reply_to_id" uuid,
  "forwarded_from_conversation_id" uuid,
  "mentions" text[],
  "system_payload" jsonb,
  "edited_at" timestamp,
  "edit_history" jsonb,
  "is_deleted" boolean NOT NULL DEFAULT false,
  "deleted_for_all" boolean NOT NULL DEFAULT false,
  "deleted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "messages_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "messages_sender_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint

CREATE INDEX "messages_conv_created_idx" ON "messages" USING btree ("conversation_id", "created_at");
--> statement-breakpoint

CREATE TABLE "message_media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL,
  "media_url" text NOT NULL,
  "thumbnail_url" text,
  "media_type" "chat_media_type" NOT NULL,
  "file_name" text,
  "mime_type" text NOT NULL,
  "file_size" integer,
  "duration" integer,
  "width" integer,
  "height" integer,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "message_media_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint

CREATE TABLE "message_reactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "emoji" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "message_reactions_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "message_reactions_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint

CREATE UNIQUE INDEX "unique_reaction_idx" ON "message_reactions" USING btree ("message_id", "user_id", "emoji");
--> statement-breakpoint

CREATE TABLE "message_read_receipts" (
  "message_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "read_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "message_read_receipts_pkey" PRIMARY KEY ("message_id", "user_id"),
  CONSTRAINT "message_read_receipts_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "message_read_receipts_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint

CREATE TABLE "pinned_messages" (
  "conversation_id" uuid NOT NULL,
  "message_id" uuid NOT NULL,
  "pinned_by" text NOT NULL,
  "pinned_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "pinned_messages_pkey" PRIMARY KEY ("conversation_id", "message_id"),
  CONSTRAINT "pinned_messages_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "pinned_messages_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "pinned_messages_pinned_by_fk" FOREIGN KEY ("pinned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);
