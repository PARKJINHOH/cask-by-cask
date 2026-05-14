import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCognacAppellationApi } from '../api/adminCognacAppellationApi'
import type { CreateCognacAppellationPayload, UpdateCognacAppellationPayload } from '@/domain/cognacappellation/types/cognacappellation.types'

export function useAdminCognacAppellations(keyword: string, page: number) {
  return useQuery({
    queryKey: ['admin-cognac-appellations', keyword, page],
    queryFn: () =>
      adminCognacAppellationApi.list({ keyword, page, size: 50 }).then((r) => r.data.data!),
  })
}

export function useCreateCognacAppellation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCognacAppellationPayload) => adminCognacAppellationApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cognac-appellations'] }),
  })
}

export function useUpdateCognacAppellation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCognacAppellationPayload }) =>
      adminCognacAppellationApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cognac-appellations'] }),
  })
}

export function useDeleteCognacAppellation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminCognacAppellationApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cognac-appellations'] }),
  })
}
