import { z } from 'zod'

export const authSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  motivo: z.enum(['sessao-expirada']).optional().catch(undefined),
})

export type AuthSearch = z.infer<typeof authSearchSchema>

export function validateAuthSearch(search: Record<string, unknown>): AuthSearch {
  return authSearchSchema.parse(search)
}
