import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminProducerRequestApi, producerRequestApi } from '../api/producerRequestApi'
import type { ProducerRegisterRequestForm } from '../types/producerRequest.types'

export function useMyProducerRequests() {
  return useQuery({
    queryKey: ['producer-requests', 'me'],
    queryFn: async () => {
      const res = await producerRequestApi.myRequests()
      return res.data.data ?? []
    },
  })
}

export function useSubmitProducerRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ProducerRegisterRequestForm) => producerRequestApi.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producer-requests', 'me'] })
    },
  })
}

export function useAdminProducerRequests(status: string, page: number) {
  return useQuery({
    queryKey: ['admin-producer-requests', status, page],
    queryFn: async () => {
      const res = await adminProducerRequestApi.list(status, page)
      return res.data.data!
    },
  })
}

export function useApproveProducerRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminProducerRequestApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-producer-requests'] })
    },
  })
}

export function useRejectProducerRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rejectReason }: { id: number; rejectReason: string }) =>
      adminProducerRequestApi.reject(id, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-producer-requests'] })
    },
  })
}
