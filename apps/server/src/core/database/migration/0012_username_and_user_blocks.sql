ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username");

CREATE TABLE IF NOT EXISTS "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "user_blocks_no_self" CHECK (blocker_id <> blocked_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_blocks_blocker_blocked_unique" ON "user_blocks" ("blocker_id", "blocked_id");
CREATE INDEX IF NOT EXISTS "user_blocks_blocker_idx" ON "user_blocks" ("blocker_id");
CREATE INDEX IF NOT EXISTS "user_blocks_blocked_idx" ON "user_blocks" ("blocked_id");
