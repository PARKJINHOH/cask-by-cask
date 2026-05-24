import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { byobApi } from '../api/byobApi'
import type {
  CreateByobPayload,
  UpdateByobPayload,
  ApplyByobPayload,
  RemoveParticipantPayload,
  RejectParticipantPayload,
  ByobStatusUpdatePayload,
} from '../types/byob.types'

export function useByobList(params: { status?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['byob', 'list', params],
    queryFn: () => byobApi.getList(params).then((r) => r.data.data!),
    staleTime: 30_000,
  })
}

export function useByobDetail(id: number) {
  return useQuery({
    queryKey: ['byob', id],
    queryFn: () => byobApi.getDetail(id).then((r) => r.data.data!),
    staleTime: 30_000,
    enabled: id > 0,
  })
}

export function useByobParticipants(byobId: number, isHost: boolean) {
  return useQuery({
    queryKey: ['byob', byobId, 'participants'],
    queryFn: () => byobApi.getParticipants(byobId).then((r) => r.data.data ?? []),
    staleTime: 15_000,
    enabled: isHost && byobId > 0,
  })
}

export function useByobComments(byobId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['byob', byobId, 'comments'],
    queryFn: () => byobApi.getComments(byobId).then((r) => r.data.data ?? []),
    staleTime: 15_000,
    enabled: enabled && byobId > 0,
  })
}

export function useByobMyHosted(params: { page?: number; size?: number }) {
  return useQuery({
    queryKey: ['byob', 'my', 'hosted', params],
    queryFn: () => byobApi.getMyHosted(params).then((r) => r.data.data!),
    staleTime: 30_000,
  })
}

export function useByobMyJoined(params: { page?: number; size?: number }) {
  return useQuery({
    queryKey: ['byob', 'my', 'joined', params],
    queryFn: () => byobApi.getMyJoined(params).then((r) => r.data.data!),
    staleTime: 30_000,
  })
}

export function useByobActions(byobId: number) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['byob', byobId] })
    qc.invalidateQueries({ queryKey: ['byob', 'list'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateByobPayload) => byobApi.create(payload),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateByobPayload) => byobApi.update(byobId, payload),
    onSuccess: invalidate,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (payload: ByobStatusUpdatePayload) => byobApi.updateStatus(byobId, payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: () => byobApi.delete(byobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['byob', 'list'] }),
  })

  const applyMutation = useMutation({
    mutationFn: (payload: ApplyByobPayload) => byobApi.apply(byobId, payload),
    onSuccess: invalidate,
  })

  const cancelApplyMutation = useMutation({
    mutationFn: () => byobApi.cancelApply(byobId),
    onSuccess: invalidate,
  })

  const approveMutation = useMutation({
    mutationFn: (pid: number) => byobApi.approveParticipant(byobId, pid),
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['byob', byobId, 'participants'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ pid, payload }: { pid: number; payload: RejectParticipantPayload }) =>
      byobApi.rejectParticipant(byobId, pid, payload),
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['byob', byobId, 'participants'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: ({ pid, payload }: { pid: number; payload: RemoveParticipantPayload }) =>
      byobApi.removeParticipant(byobId, pid, payload),
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['byob', byobId, 'participants'] })
    },
  })

  const createCommentMutation = useMutation({
    mutationFn: (payload: { content: string; parentId?: number }) =>
      byobApi.createComment(byobId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['byob', byobId, 'comments'] }),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (cid: number) => byobApi.deleteComment(byobId, cid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['byob', byobId, 'comments'] }),
  })

  return {
    createMutation,
    updateMutation,
    updateStatusMutation,
    deleteMutation,
    applyMutation,
    cancelApplyMutation,
    approveMutation,
    rejectMutation,
    removeMutation,
    createCommentMutation,
    deleteCommentMutation,
  }
}
