import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCognacHouseApi } from '../api/adminCognacHouseApi'
import type { CreateCognacHousePayload, UpdateCognacHousePayload } from '@/domain/cognachouse/types/cognachouse.types'

export interface CognacHouseFilters {
  nameKo?: string
  nameEn?: string
  country?: string
  foundedYear?: string
}

export function useAdminCognacHouses(filters: CognacHouseFilters, page: number, sort = 'id,desc') {
  return useQuery({
    queryKey: ['admin-cognac-houses', filters, page, sort],
    queryFn: () =>
      adminCognacHouseApi
        .list({
          nameKo: filters.nameKo?.trim() || undefined,
          nameEn: filters.nameEn?.trim() || undefined,
          country: filters.country?.trim() || undefined,
          foundedYear: filters.foundedYear?.trim() ? Number(filters.foundedYear) : undefined,
          page,
          size: 20,
          sort,
        })
        .then((r) => r.data.data!),
  })
}

export function useCreateCognacHouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCognacHousePayload) => adminCognacHouseApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cognac-houses'] }),
  })
}

export function useUpdateCognacHouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCognacHousePayload }) =>
      adminCognacHouseApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cognac-houses'] }),
  })
}

export function useDeleteCognacHouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminCognacHouseApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cognac-houses'] }),
  })
}
