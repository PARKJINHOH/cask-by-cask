import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminSpiritApi } from '../api/adminSpiritApi'
import type {
  CreateSpiritPayload,
  ApproveVariantReviewPayload,
  ModerationPayload,
  UpdateSpiritPayload,
  VariantReviewRequestStatus,
} from '../types/admin.types'
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
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirit-detail', id] })
    },
  })
}

export function useDeleteSpirit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminSpiritApi.delete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirit-detail', id] })
    },
  })
}

export function usePermanentlyDeleteSpirit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminSpiritApi.permanentlyDelete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
      queryClient.removeQueries({ queryKey: ['admin-spirit-detail', id] })
      queryClient.removeQueries({ queryKey: ['admin-spirit-variants', id] })
    },
  })
}

export function useRestoreSpirit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminSpiritApi.restore(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirit-detail', id] })
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

export function useReorderSpiritImages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, imageIds }: { id: number; imageIds: number[] }) =>
      adminSpiritApi.reorderImages(id, imageIds),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-spirit-detail', id] })
    },
  })
}

// ── 연관 술(다른 배치·병입) 수동 관리 ──
export function useAdminSpiritVariants(id: number) {
  return useQuery({
    queryKey: ['admin-spirit-variants', id],
    queryFn: () => adminSpiritApi.getVariants(id).then((res) => res.data.data ?? []),
    enabled: !isNaN(id),
  })
}

export function useAddSpiritVariant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, targetId }: { id: number; targetId: number }) =>
      adminSpiritApi.addVariant(id, targetId),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-spirit-variants', id] })
    },
  })
}

export function useRemoveSpiritVariant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, targetId }: { id: number; targetId: number }) =>
      adminSpiritApi.removeVariant(id, targetId),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-spirit-variants', id] })
    },
  })
}

export function useAdminVariantRequests(params: {
  keyword?: string
  status?: SpiritStatus
  page: number
}) {
  return useQuery({
    queryKey: ['admin-variant-requests', params],
    queryFn: () =>
      adminSpiritApi
        .listVariantRequests({ ...params, size: 20 })
        .then((res) => res.data.data!),
  })
}

export function useApproveVariantRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminSpiritApi.approveVariantRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-variant-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirit-detail'] })
    },
  })
}

export function useRejectVariantRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: ModerationPayload }) =>
      adminSpiritApi.rejectVariantRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-variant-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirit-detail'] })
    },
  })
}

export function useAdminVariantReviewRequests(params: {
  keyword?: string
  status?: VariantReviewRequestStatus | 'ALL'
  page: number
}) {
  return useQuery({
    queryKey: ['admin-variant-review-requests', params],
    queryFn: () =>
      adminSpiritApi
        .listVariantReviewRequests({
          keyword: params.keyword,
          status: params.status === 'ALL' ? undefined : params.status,
          page: params.page,
          size: 20,
        })
        .then((res) => res.data.data!),
  })
}

export function useApproveVariantReviewRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: ApproveVariantReviewPayload }) =>
      adminSpiritApi.approveVariantReviewRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-variant-review-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-variant-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirit-detail'] })
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
  })
}

export function useApproveSavedVariantReviewRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, targetVariantId }: { id: number; targetVariantId: number }) =>
      adminSpiritApi.approveSavedVariantReviewRequest(id, targetVariantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-variant-review-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-variant-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirit-detail'] })
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
  })
}

export function useRejectSavedVariantReviewRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, targetVariantId, reason }: { id: number; targetVariantId: number; reason: string }) =>
      adminSpiritApi.rejectSavedVariantReviewRequest(id, targetVariantId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-variant-review-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-variant-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirits'] })
      queryClient.invalidateQueries({ queryKey: ['admin-spirit-detail'] })
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
  })
}

export function useRejectVariantReviewRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ModerationPayload }) =>
      adminSpiritApi.rejectVariantReviewRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-variant-review-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
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
