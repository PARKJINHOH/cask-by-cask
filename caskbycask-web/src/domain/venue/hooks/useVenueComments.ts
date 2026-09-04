import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { venueCommentApi, type VenueCommentPayload } from '@/domain/venue/api/venueCommentApi'
import type { VenueCommentImagePlanItem } from '@/domain/venue/types/venue.types'

export function useVenueComments(venueId: number | null) {
  return useQuery({
    queryKey: ['venues', 'comments', venueId],
    queryFn: () => venueCommentApi.list(venueId!).then((r) => r.data.data!),
    enabled: venueId != null,
  })
}

export function useVenueGallery(venueId: number | null) {
  return useQuery({
    queryKey: ['venues', 'gallery', venueId],
    queryFn: () => venueCommentApi.gallery(venueId!).then((r) => r.data.data!),
    enabled: venueId != null,
  })
}

/**
 * 댓글을 고치면 갤러리도 함께 버린다 — 사진 탭은 댓글 사진을 모은 것이라
 * 한쪽만 갱신하면 방금 올린 사진이 사진 탭에 안 보인다.
 */
function invalidate(qc: ReturnType<typeof useQueryClient>, venueId: number) {
  qc.invalidateQueries({ queryKey: ['venues', 'comments', venueId] })
  qc.invalidateQueries({ queryKey: ['venues', 'gallery', venueId] })
}

export function useCreateVenueComment(venueId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payload, files }: { payload: VenueCommentPayload; files: File[] }) =>
      venueCommentApi.create(venueId, payload, files),
    onSuccess: () => invalidate(qc, venueId),
  })
}

export function useUpdateVenueComment(venueId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      commentId,
      payload,
      files,
      imagePlan,
    }: {
      commentId: number
      payload: VenueCommentPayload
      files: File[]
      imagePlan: VenueCommentImagePlanItem[]
    }) => venueCommentApi.update(commentId, payload, files, imagePlan),
    onSuccess: () => invalidate(qc, venueId),
  })
}

export function useDeleteVenueComment(venueId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) => venueCommentApi.delete(commentId),
    onSuccess: () => invalidate(qc, venueId),
  })
}
