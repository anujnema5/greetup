ALTER TABLE "circle_categories" RENAME TO "room_categories";--> statement-breakpoint
ALTER INDEX "circle_categories_active_sort_idx" RENAME TO "room_categories_active_sort_idx";--> statement-breakpoint
ALTER TABLE "room_categories" RENAME CONSTRAINT "circle_categories_slug_unique" TO "room_categories_slug_unique";--> statement-breakpoint
ALTER TABLE "rooms" RENAME CONSTRAINT "rooms_category_id_circle_categories_id_fk" TO "rooms_category_id_room_categories_id_fk";--> statement-breakpoint
