CREATE TYPE "public"."notification_type" AS ENUM('connection_request_received', 'circle_invite_received');
CREATE TYPE "public"."notification_entity_type" AS ENUM('connection', 'room');

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipient_user_id" text NOT NULL,
  "actor_user_id" text,
  "type" "notification_type" NOT NULL,
  "entity_type" "notification_entity_type" NOT NULL,
  "entity_id" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "dedupe_key" text,
  "read_at" timestamp,
  "archived_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "notifications_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);

CREATE INDEX "notifications_recipient_created_at_idx" ON "notifications" USING btree ("recipient_user_id", "created_at");
CREATE INDEX "notifications_recipient_read_at_idx" ON "notifications" USING btree ("recipient_user_id", "read_at");
CREATE UNIQUE INDEX "notifications_dedupe_key_unique" ON "notifications" USING btree ("dedupe_key");
