import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { popupApi } from '../api/popupApi'
import type {
  PopupLanguage,
  CreatePopupPayload,
  UpdatePopupPayload,
} from '../types/popup.types'

const QUERY_KEY = 'adminPopups'

export function useAdminPopupList(params: {
  language?: PopupLanguage
  isVisible?: boolean
  page?: number
  size?: number
}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => popupApi.getAdminPopups(params).then((r) => r.data.data!),
  })
}

export function useAdminPopupDetail(id: number | null) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => popupApi.getAdminPopupDetail(id!).then((r) => r.data.data!),
    enabled: id != null,
  })
}

export function useCreatePopup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePopupPayload) =>
      popupApi.createPopup(data).then((r) => r.data.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdatePopup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePopupPayload }) =>
      popupApi.updatePopup(id, data).then((r) => r.data.data!),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeletePopup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => popupApi.deletePopup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isVisible }: { id: number; isVisible: boolean }) =>
      popupApi.updateVisibility(id, isVisible),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateSortOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sortOrder }: { id: number; sortOrder: number }) =>
      popupApi.updateSortOrder(id, sortOrder),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
