import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminProducerRequestApi, producerRequestApi } from '../api/producerRequestApi'
import type { ProducerRegisterRequestForm, UpdateProducerRequestPayload } from '../types/producerRequest.types'

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

export function useAdminProducerRequest(id: number) {
  return useQuery({
    queryKey: ['admin-producer-request', id],
    queryFn: async () => {
      const res = await adminProducerRequestApi.detail(id)
      return res.data.data!
    },
    enabled: Number.isFinite(id),
  })
}

export function useUpdateProducerRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateProducerRequestPayload }) =>
      adminProducerRequestApi.update(id, body),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-producer-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-producer-request', id] })
    },
  })
}

export function useApproveProducerRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminProducerRequestApi.approve(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-producer-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-producer-request', id] })
    },
  })
}

export function useRejectProducerRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rejectReason }: { id: number; rejectReason: string }) =>
      adminProducerRequestApi.reject(id, rejectReason),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-producer-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-producer-request', id] })
    },
  })
}
