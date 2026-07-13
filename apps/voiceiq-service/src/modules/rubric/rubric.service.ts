import { rubricRepository } from './repositories/rubric.repository.ts'

export const rubricService = {
  async create(
    companyId: string,
    body: {
      name: string
      context?: string
      dimensions?: { key: string; weight: number; min_score?: number }[]
      auto_reject_below?: number
    },
  ) {
    const dimensions = body.dimensions
      ? Object.fromEntries(body.dimensions.map(d => [d.key, d.weight]))
      : {}

    const rubric = await rubricRepository.insert({
      companyId,
      name:            body.name,
      context:         body.context ?? '',
      dimensions,
      autoRejectBelow: body.auto_reject_below ?? 0,
    })

    return { rubric_id: rubric.id }
  },

  async list(companyId: string) {
    const list = await rubricRepository.listByCompany(companyId)
    return { rubrics: list }
  },

  async getForCompany(companyId: string, id: string) {
    const rubric = await rubricRepository.findById(id)
    if (!rubric || rubric.companyId !== companyId) return { error: 'not_found' as const }
    return { rubric }
  },
}
