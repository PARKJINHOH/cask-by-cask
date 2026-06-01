import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminWineryApi } from '../api/adminWineryApi'
import type { CreateWineryPayload, UpdateWineryPayload } from '@/domain/winery/types/winery.types'

export interface WineryFilters {
  nameKo?: string
  nameEn?: string
  country?: string
  foundedYear?: string
}

export function useAdminWineries(filters: WineryFilters, page: number) {
  return useQuery({
    queryKey: ['admin-wineries', filters, page],
    queryFn: () =>
      adminWineryApi
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
