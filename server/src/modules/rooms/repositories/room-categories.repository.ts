import { and, asc, eq } from "drizzle-orm";

import { db } from "@/core/database";
import { roomCategories } from "@/core/database/schema";

export const roomCategoriesRepository = {
  async findActiveCategoryById(categoryId: string) {
    return db.query.roomCategories.findFirst({
      where: and(
        eq(roomCategories.id, categoryId),
        eq(roomCategories.isActive, true),
      ),
    });
  },

  async findActiveCategoryBySlug(slug: string) {
    return db.query.roomCategories.findFirst({
      where: and(eq(roomCategories.slug, slug), eq(roomCategories.isActive, true)),
      columns: { id: true },
    });
  },

  async listActiveCategories() {
    return db.query.roomCategories.findMany({
      where: eq(roomCategories.isActive, true),
      orderBy: [asc(roomCategories.sortOrder), asc(roomCategories.displayName)],
      columns: {
        id: true,
        slug: true,
        displayName: true,
        emoji: true,
        description: true,
        sortOrder: true,
      },
    });
  },
};
