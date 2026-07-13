ALTER TABLE "conversation_participants" ADD COLUMN IF NOT EXISTS "history_hidden_before_at" timestamp;
