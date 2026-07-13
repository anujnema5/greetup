CREATE TYPE "public"."connection_status" AS ENUM('pending', 'accepted', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "user_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" text NOT NULL,
	"addressee_id" text NOT NULL,
	"status" "connection_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_connections_no_self" CHECK (requester_id <> addressee_id)
);
--> statement-breakpoint
ALTER TABLE "user_connections" ADD CONSTRAINT "user_connections_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_connections" ADD CONSTRAINT "user_connections_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_connections_requester_addressee_unique" ON "user_connections" USING btree ("requester_id","addressee_id");--> statement-breakpoint
CREATE INDEX "user_connections_requester_status_idx" ON "user_connections" USING btree ("requester_id","status");--> statement-breakpoint
CREATE INDEX "user_connections_addressee_status_idx" ON "user_connections" USING btree ("addressee_id","status");