import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { noticeApi } from '../api/noticeApi'
import type { NoticeCategory, CreateNoticePayload, UpdateNoticePayload } from '../types/notice.types'

const QUERY_KEY = 'adminNotices'

export function useAdminNoticeList(params: {
  category?: NoticeCategory
  isPublished?: boolean
  page?: number
  size?: number
}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => noticeApi.adminList(params).then((r) => r.data.data!),
  })
}

export function useAdminNoticeDetail(id: number | null) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => noticeApi.adminGetDetail(id!).then((r) => r.data.data!),
    enabled: id != null,
  })
}

export function useCreateNotice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateNoticePayload) => noticeApi.create(data).then((r) => r.data.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateNotice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateNoticePayload }) =>
      noticeApi.update(id, data).then((r) => r.data.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteNotice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => noticeApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateNoticeDisplayOrders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (noticeIds: number[]) => noticeApi.updateDisplayOrders(noticeIds).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
