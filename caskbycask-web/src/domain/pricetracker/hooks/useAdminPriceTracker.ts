import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminPriceTrackerApi } from '../api/adminPriceTrackerApi'
import type { DutyFreeChannel, PriceReportStatus, StoreType } from '../types/pricetracker.types'

// ── 가격 등록 승인 ──────────────────────────────────
export function useAdminPriceReports(params: { status?: PriceReportStatus; isFlagged?: boolean; page: number }) {
  return useQuery({
    queryKey: ['admin', 'priceReports', params],
    queryFn: () => adminPriceTrackerApi.getPriceReports(params),
    select: (res) => res.data.data,
  })
}

export function useAdminPriceReport(id: number) {
  return useQuery({
    queryKey: ['admin', 'priceReports', id],
    queryFn: () => adminPriceTrackerApi.getPriceReport(id),
    select: (res) => res.data.data,
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 0,
  })
}

export function useApprovePriceReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, storeId }: { id: number; storeId?: number | null }) =>
      adminPriceTrackerApi.approve(id, storeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'priceReports'] }),
  })
}

export function useRejectPriceReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rejectReason }: { id: number; rejectReason: string }) =>
      adminPriceTrackerApi.reject(id, rejectReason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'priceReports'] }),
  })
}

// ── 매장 관리 ──────────────────────────────────────
export function useAdminStores(params: { keyword?: string; isApproved?: boolean; page: number }) {
  return useQuery({
    queryKey: ['admin', 'stores', params],
    queryFn: () => adminPriceTrackerApi.getStores(params),
    select: (res) => res.data.data,
  })
}

export function useCreateStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { displayName: string; storeType: StoreType; dutyfreeChannel?: DutyFreeChannel | null; region?: string | null }) =>
      adminPriceTrackerApi.createStore(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'stores'] }),
  })
}

export function useApproveStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminPriceTrackerApi.approveStore(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'stores'] }),
  })
}

export function useDeleteStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminPriceTrackerApi.deleteStore(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'stores'] }),
  })
}

export function useStoreAliases(id: number | null) {
  return useQuery({
    queryKey: ['admin', 'storeAliases', id],
    queryFn: () => adminPriceTrackerApi.getAliases(id!),
    select: (res) => res.data.data,
    enabled: id != null,
  })
}

export function useAddAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, alias }: { id: number; alias: string }) => adminPriceTrackerApi.addAlias(id, alias),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['admin', 'storeAliases', v.id] }),
  })
}

export function useDeleteAlias(storeId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (aliasId: number) => adminPriceTrackerApi.deleteAlias(aliasId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'storeAliases', storeId] }),
  })
}

export function useMergeStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ suggestedId, targetStoreId }: { suggestedId: number; targetStoreId: number }) =>
      adminPriceTrackerApi.mergeStore(suggestedId, targetStoreId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'stores'] }),
  })
}
