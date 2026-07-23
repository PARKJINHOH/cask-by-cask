import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminPriceTrackerApi } from '../api/adminPriceTrackerApi'
import type { PriceReportStatus, StoreType } from '../types/pricetracker.types'

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
    mutationFn: ({ id, volumeMl, storeType }: { id: number; volumeMl?: number | null; storeType?: StoreType }) =>
      adminPriceTrackerApi.approve(id, volumeMl, storeType),
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
