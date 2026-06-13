import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { legalApi } from '../api/legalApi'
import type { LegalDocumentType, CreateLegalDocumentRequest, UpdateLegalDocumentRequest } from '../types/legal.types'

const QUERY_KEY = 'adminLegal'

export function useAdminLegalList(type: LegalDocumentType, page = 0, size = 20) {
  return useQuery({
    queryKey: [QUERY_KEY, type, page],
    queryFn: () => legalApi.adminList({ type, page, size }).then((r) => r.data.data!),
  })
}

export function useAdminLegalDetail(id: number | null) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => legalApi.adminGetById(id!).then((r) => r.data.data!),
    enabled: id != null,
  })
}

export function useCreateLegalDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLegalDocumentRequest) =>
      legalApi.create(data).then((r) => r.data.data!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: ['legal'] })
    },
  })
}

export function useUpdateLegalDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLegalDocumentRequest }) =>
      legalApi.adminUpdate(id, data).then((r) => r.data.data!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: ['legal'] })
    },
  })
}

export function useActivateLegalDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => legalApi.activate(id).then((r) => r.data.data!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: ['legal'] })
    },
  })
}

export function useDeleteLegalDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => legalApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
