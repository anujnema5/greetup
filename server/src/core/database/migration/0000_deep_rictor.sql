CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('available', 'busy', 'offline');--> statement-breakpoint
CREATE TYPE "public"."is_active" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TYPE "public"."user_banned" AS ENUM('yes', 'no', 'temporarily');--> statement-breakpoint
CREATE TYPE "public"."distance_preference" AS ENUM('nearby', 'same city', 'same country', 'random', 'global');--> statement-breakpoint
CREATE TYPE "public"."preferred_gender" AS ENUM('any', 'male', 'female', 'others', 'same');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "behavior" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"trust_score" integer DEFAULT 100 NOT NULL,
	"successful_connections" integer DEFAULT 0 NOT NULL,
	"average_session_duration" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "behavior_user_profile_id_unique" UNIQUE("user_profile_id")
);
--> statement-breakpoint
CREATE TABLE "current_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"session_goal" text,
	"availability" "availability" DEFAULT 'offline' NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "current_status_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "current_status_looking_for" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"current_status_id" uuid NOT NULL,
	"looking_for_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_status_looking_for" UNIQUE("current_status_id","looking_for_id")
);
--> statement-breakpoint
CREATE TABLE "current_status_moods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"current_status_id" uuid NOT NULL,
	"mood_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_status_mood" UNIQUE("current_status_id","mood_id")
);
--> statement-breakpoint
CREATE TABLE "looking_for_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "looking_for_options_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "moods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "moods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"emoji" varchar(20),
	"is_active" "is_active" DEFAULT 'yes',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "goals_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "profile_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_profile_goal" UNIQUE("profile_id","goal_id")
);
--> statement-breakpoint
CREATE TABLE "interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"category" text NOT NULL,
	"emoji" varchar(20),
	"is_active" "is_active" DEFAULT 'yes',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"category" text NOT NULL,
	"is_active" "is_active" DEFAULT 'yes',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interest_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_interests_interest_id_profile_id_unique" UNIQUE("interest_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "profile_professions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profession_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_professions_profession_id_profile_id_unique" UNIQUE("profession_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "user_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"country" text,
	"country_code" text,
	"region" text,
	"region_code" text,
	"city" text,
	"latitude" double precision,
	"longitude" double precision,
	"location" geometry(point),
	"timezone" text,
	"source" text,
	"is_public" boolean DEFAULT false,
	"radius_preference" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_locations_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "user_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"order" integer DEFAULT 0,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"purpose" text,
	"bio" text,
	"gender" text,
	"age" integer,
	"profession" text,
	"education_level" text,
	"personality_tags" text,
	"profile_completion" integer DEFAULT 0,
	"trust_score" integer DEFAULT 0,
	"is_onboarded" boolean DEFAULT false NOT NULL,
	"is_premium" boolean DEFAULT false,
	"premium_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone_number" text,
	"phone_number_verified" boolean DEFAULT false,
	"display_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_banned" "user_banned" DEFAULT 'no' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "connection_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"emoji" varchar(20),
	"is_active" text DEFAULT 'yes',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "connection_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "profile_connection_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_preference_id" uuid NOT NULL,
	"connection_type_id" uuid NOT NULL,
	"priority" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_profile_connection_type" UNIQUE("profile_preference_id","connection_type_id")
);
--> statement-breakpoint
CREATE TABLE "profile_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"preferred_gender" "preferred_gender" DEFAULT 'any' NOT NULL,
	"distance_preference" "distance_preference" DEFAULT 'random' NOT NULL,
	"min_age" integer DEFAULT 18 NOT NULL,
	"max_age" integer DEFAULT 99 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_preferences_profile_id_unique" UNIQUE("profile_id"),
	CONSTRAINT "age_range_check" CHECK ("profile_preferences"."min_age" <= "profile_preferences"."max_age")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior" ADD CONSTRAINT "behavior_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_status" ADD CONSTRAINT "current_status_profile_id_user_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_status_looking_for" ADD CONSTRAINT "current_status_looking_for_current_status_id_current_status_id_fk" FOREIGN KEY ("current_status_id") REFERENCES "public"."current_status"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_status_looking_for" ADD CONSTRAINT "current_status_looking_for_looking_for_id_looking_for_options_id_fk" FOREIGN KEY ("looking_for_id") REFERENCES "public"."looking_for_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_status_moods" ADD CONSTRAINT "current_status_moods_current_status_id_current_status_id_fk" FOREIGN KEY ("current_status_id") REFERENCES "public"."current_status"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_status_moods" ADD CONSTRAINT "current_status_moods_mood_id_moods_id_fk" FOREIGN KEY ("mood_id") REFERENCES "public"."moods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_goals" ADD CONSTRAINT "profile_goals_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_goals" ADD CONSTRAINT "profile_goals_profile_id_user_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_interests" ADD CONSTRAINT "profile_interests_interest_id_interests_id_fk" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_interests" ADD CONSTRAINT "profile_interests_profile_id_user_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_professions" ADD CONSTRAINT "profile_professions_profession_id_professions_id_fk" FOREIGN KEY ("profession_id") REFERENCES "public"."professions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_professions" ADD CONSTRAINT "profile_professions_profile_id_user_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_profile_id_user_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_photos" ADD CONSTRAINT "user_photos_profile_id_user_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_connection_types" ADD CONSTRAINT "profile_connection_types_profile_preference_id_profile_preferences_id_fk" FOREIGN KEY ("profile_preference_id") REFERENCES "public"."profile_preferences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_connection_types" ADD CONSTRAINT "profile_connection_types_connection_type_id_connection_types_id_fk" FOREIGN KEY ("connection_type_id") REFERENCES "public"."connection_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_preferences" ADD CONSTRAINT "profile_preferences_profile_id_user_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idx_current_status_profile" ON "current_status" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_current_status_availability" ON "current_status" USING btree ("availability");--> statement-breakpoint
CREATE INDEX "idx_status_looking_for_status" ON "current_status_looking_for" USING btree ("current_status_id");--> statement-breakpoint
CREATE INDEX "idx_status_looking_for_option" ON "current_status_looking_for" USING btree ("looking_for_id");--> statement-breakpoint
CREATE INDEX "idx_status_moods_status" ON "current_status_moods" USING btree ("current_status_id");--> statement-breakpoint
CREATE INDEX "idx_status_moods_mood" ON "current_status_moods" USING btree ("mood_id");--> statement-breakpoint
CREATE INDEX "idx_profile_goals_profile" ON "profile_goals" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_profile_goals_goal" ON "profile_goals" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "profile_interests_profile_id_idx" ON "profile_interests" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_interests_interest_id_idx" ON "profile_interests" USING btree ("interest_id");--> statement-breakpoint
CREATE INDEX "profile_professions_profile_id_idx" ON "profile_professions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_professions_profession_id_idx" ON "profile_professions" USING btree ("profession_id");--> statement-breakpoint
CREATE INDEX "idx_profile_connection_types_preference" ON "profile_connection_types" USING btree ("profile_preference_id");--> statement-breakpoint
CREATE INDEX "idx_profile_connection_types_connection" ON "profile_connection_types" USING btree ("connection_type_id");--> statement-breakpoint
CREATE INDEX "idx_profile_preferences_profile" ON "profile_preferences" USING btree ("profile_id");