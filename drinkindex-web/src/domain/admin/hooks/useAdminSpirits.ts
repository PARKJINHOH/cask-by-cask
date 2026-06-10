import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminSpiritApi } from '../api/adminSpiritApi'
import type { UpdateSpiritPayload, CreateSpiritPayload } from '../types/admin.types'
// CreateSpiritPayload 재사용 (등록 요청 상세 승인 시 전체 상세 전송)
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

export function useAdminSpiritDetail(id: number) {
  return useQuery({
    queryKey: ['admin-spirit-detail', id],
    queryFn: () => adminSpiritApi.getById(id).then((res) => res.data.data!),
    enabled: !isNaN(id),
  })
}

export function useUploadSpiritImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      adminSpiritApi.uploadImage(id, file),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-spirit-detail', id] })
    },
  })
}

export function useDeleteSpiritImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, imageId }: { id: number; imageId: number }) =>
      adminSpiritApi.deleteImage(id, imageId),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-spirit-detail', id] })
    },
  })
}

export function useSetPrimarySpiritImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, imageId }: { id: number; imageId: number }) =>
      adminSpiritApi.setPrimaryImage(id, imageId),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-spirit-detail', id] })
    },
  })
}

export function useAdminRequests(status: string, page: number) {
  return useQuery({
    queryKey: ['admin-requests', status, page],
    queryFn: () =>
      adminSpiritApi
        .listRequests({ status: status === 'ALL' ? undefined : status, page, size: 20 })
        .then((res) => res.data.data!),
  })
}

export function useAdminRequestDetail(id: number) {
  return useQuery({
    queryKey: ['admin-request-detail', id],
    queryFn: () => adminSpiritApi.getRequestDetail(id).then((res) => res.data.data!),
  })
}

export function useUploadRequestImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      adminSpiritApi.uploadRequestImage(id, file),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-request-detail', id] })
    },
  })
}

export function useRemoveRequestImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, imageUrl }: { id: number; imageUrl: string }) =>
      adminSpiritApi.removeRequestImage(id, imageUrl),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-request-detail', id] })
    },
  })
}

export function useApproveRequestWithDetail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateSpiritPayload }) =>
      adminSpiritApi.approveRequestWithDetail(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-request-detail'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
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
      queryClient.invalidateQueries({ queryKey: ['admin-request-detail'] })
    },
  })
}
