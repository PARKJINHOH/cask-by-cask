import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminWineryApi } from '../api/adminWineryApi'
import type { CreateWineryPayload, UpdateWineryPayload } from '@/domain/winery/types/winery.types'

export function useAdminWineries(keyword: string, page: number) {
  return useQuery({
    queryKey: ['admin-wineries', keyword, page],
    queryFn: () =>
      adminWineryApi.list({ keyword, page, size: 20 }).then((r) => r.data.data!),
  })
}

export function useCreateWinery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWineryPayload) => adminWineryApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-wineries'] }),
  })
}

export function useUpdateWinery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWineryPayload }) =>
      adminWineryApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-wineries'] }),
  })
}

export function useDeleteWinery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminWineryApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-wineries'] }),
  })
}
