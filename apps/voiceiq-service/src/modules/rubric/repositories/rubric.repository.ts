import { eq } from 'drizzle-orm'
import { db } from '@/core/database/index.ts'
import { rubrics } from '@/core/database/schema/index.ts'

export const rubricRepository = {
  insert(values: typeof rubrics.$inferInsert) {
    return db
      .insert(rubrics)
      .values(values)
      .returning()
      .then(([row]) => row)
  },

  listByCompany(companyId: string) {
    return db.select().from(rubrics).where(eq(rubrics.companyId, companyId))
  },

  findById(id: string) {
    return db
      .select()
      .from(rubrics)
      .where(eq(rubrics.id, id))
      .limit(1)
      .then(([row]) => row ?? null)
  },
}
