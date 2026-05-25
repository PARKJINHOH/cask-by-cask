import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { faqApi } from '../api/faqApi'
import type { FaqLanguage } from '../types/faq.types'

const KEYS = {
  public: (lang: string) => ['faq', 'public', lang] as const,
  adminList: (language?: FaqLanguage) => ['faq', 'admin', language ?? 'ALL'] as const,
  adminDetail: (id: number) => ['faq', 'admin', id] as const,
}

// ── 공개 ──────────────────────────────────────────────────────

export function usePublicFaqs(lang: string) {
  return useQuery({
    queryKey: KEYS.public(lang),
    queryFn: () => faqApi.getPublicFaqs(lang).then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,
  })
}

// ── 관리자 ────────────────────────────────────────────────────

export function useAdminFaqList(language?: FaqLanguage) {
  return useQuery({
    queryKey: KEYS.adminList(language),
    queryFn: () => faqApi.getAdminFaqs(language).then((r) => r.data.data),
  })
}

export function useAdminFaqDetail(id: number) {
  return useQuery({
    queryKey: KEYS.adminDetail(id),
    queryFn: () => faqApi.getAdminFaqDetail(id).then((r) => r.data.data),
    enabled: id > 0,
  })
}

export function useCreateFaq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: faqApi.createFaq,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faq', 'admin'] }),
  })
}

export function useUpdateFaq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof faqApi.updateFaq>[1] }) =>
      faqApi.updateFaq(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faq', 'admin'] }),
  })
}

export function useDeleteFaq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: faqApi.deleteFaq,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faq', 'admin'] }),
  })
}

export function useUpdateFaqActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      faqApi.updateActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faq', 'admin'] }),
  })
}
