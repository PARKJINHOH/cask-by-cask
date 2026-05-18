import { useQuery } from '@tanstack/react-query'
import { legalApi } from '../api/legalApi'
import type { LegalDocumentType } from '../types/legal.types'

export function useLegalLatest(type: LegalDocumentType, enabled = true) {
  return useQuery({
    queryKey: ['legal', 'latest', type],
    queryFn: () => legalApi.getLatest(type).then((r) => r.data.data!),
    enabled,
    retry: false,
    staleTime: 1000 * 60 * 10,
  })
}
