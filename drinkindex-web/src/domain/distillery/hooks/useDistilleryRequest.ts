import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminDistilleryRequestApi, distilleryRequestApi } from '../api/distilleryRequestApi'
import type { DistilleryRegisterRequestForm } from '../types/distilleryRequest.types'

export function useMyDistilleryRequests() {
  return useQuery({
    queryKey: ['distillery-requests', 'me'],
    queryFn: async () => {
      const res = await distilleryRequestApi.myRequests()
      return res.data.data ?? []
    },
  })
}

export function useSubmitDistilleryRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: DistilleryRegisterRequestForm) => distilleryRequestApi.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distillery-requests', 'me'] })
    },
  })
}

export function useAdminDistilleryRequests(status: string, page: number) {
  return useQuery({
    queryKey: ['admin-distillery-requests', status, page],
    queryFn: async () => {
      const res = await adminDistilleryRequestApi.list(status, page)
      return res.data.data!
    },
  })
}

export function useApproveDistilleryRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminDistilleryRequestApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-distillery-requests'] })
    },
  })
}

export function useRejectDistilleryRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rejectReason }: { id: number; rejectReason: string }) =>
      adminDistilleryRequestApi.reject(id, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-distillery-requests'] })
    },
  })
}
