import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminDistilleryApi } from '../api/adminDistilleryApi'
import type { CreateDistilleryPayload, UpdateDistilleryPayload } from '@/domain/distillery/types/distillery.types'

export interface DistilleryFilters {
  nameKo?: string
  nameEn?: string
  country?: string
  foundedYear?: string
}

export function useAdminDistilleries(filters: DistilleryFilters, page: number) {
  return useQuery({
    queryKey: ['admin-distilleries', filters, page],
    queryFn: () =>
      adminDistilleryApi
        .list({
          nameKo: filters.nameKo?.trim() || undefined,
          nameEn: filters.nameEn?.trim() || undefined,
          country: filters.country?.trim() || undefined,
          foundedYear: filters.foundedYear?.trim() ? Number(filters.foundedYear) : undefined,
          page,
          size: 20,
          sort: 'id,desc',
        })
        .then((r) => r.data.data!),
  })
}

export function useCreateDistillery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDistilleryPayload) => adminDistilleryApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-distilleries'] })
      qc.invalidateQueries({ queryKey: ['distilleries'] })
    },
  })
}

export function useUpdateDistillery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDistilleryPayload }) =>
      adminDistilleryApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-distilleries'] })
      qc.invalidateQueries({ queryKey: ['distilleries'] })
    },
  })
}

export function useDeleteDistillery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminDistilleryApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-distilleries'] })
      qc.invalidateQueries({ queryKey: ['distilleries'] })
    },
  })
}
