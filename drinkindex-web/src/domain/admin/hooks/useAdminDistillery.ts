import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminDistilleryApi } from '../api/adminDistilleryApi'
import type { CreateDistilleryPayload, UpdateDistilleryPayload } from '@/domain/distillery/types/distillery.types'

export function useAdminDistilleries(keyword: string, page: number) {
  return useQuery({
    queryKey: ['admin-distilleries', keyword, page],
    queryFn: () =>
      adminDistilleryApi.list({ keyword, page, size: 20 }).then((r) => r.data.data!),
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
