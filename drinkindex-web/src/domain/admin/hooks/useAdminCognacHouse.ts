import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminCognacHouseApi } from '../api/adminCognacHouseApi'
import type { CreateCognacHousePayload, UpdateCognacHousePayload } from '@/domain/cognachouse/types/cognachouse.types'

export function useAdminCognacHouses(keyword: string, page: number) {
  return useQuery({
    queryKey: ['admin-cognac-houses', keyword, page],
    queryFn: () =>
      adminCognacHouseApi.list({ keyword, page, size: 20 }).then((r) => r.data.data!),
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
