import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminSpiritApi } from '../api/adminSpiritApi'
import type { UpdateSpiritPayload } from '../types/admin.types'
import type { SpiritCategory, SpiritStatus } from '@/domain/spirit/types/spirit.types'

interface SpiritListParams {
  keyword?: string
  category?: SpiritCategory
  status?: SpiritStatus
  page: number
}

export function useAdminSpirits(params: SpiritListParams) {
  return useQuery({
    queryKey: ['admin-spirits', params],
    queryFn: () =>
      adminSpiritApi.list({ ...params, size: 20 }).then((res) => res.data.data!),
  })
}

export function useUpdateSpirit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSpiritPayload }) =>
      adminSpiritApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
    },
  })
}

export function useDeleteSpirit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminSpiritApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
    },
  })
}

export function useAdminRequests(status: string, page: number) {
  return useQuery({
    queryKey: ['admin-requests', status, page],
    queryFn: () =>
      adminSpiritApi.listRequests({ status, page, size: 20 }).then((res) => res.data.data!),
  })
}

export function useApproveRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminSpiritApi.approveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] })
    },
  })
}

export function useRejectRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminSpiritApi.rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] })
    },
  })
}
