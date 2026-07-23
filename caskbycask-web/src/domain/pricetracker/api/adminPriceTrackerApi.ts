import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  AdminPriceReport,
  PriceReportStatus,
  StoreType,
} from '../types/pricetracker.types'

export const adminPriceTrackerApi = {
  // ── 가격 등록 승인 ────────────────────────────────
  getPriceReports: (params: { status?: PriceReportStatus; isFlagged?: boolean; page: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<AdminPriceReport>>>('/api/admin/price-reports', {
      params: { status: params.status, isFlagged: params.isFlagged, page: params.page, size: 20 },
    }),

  getPriceReport: (id: number) =>
    axiosInstance.get<ApiResponse<AdminPriceReport>>(`/api/admin/price-reports/${id}`),

  approve: (id: number, volumeMl?: number | null, storeType?: StoreType) =>
    axiosInstance.patch<ApiResponse<AdminPriceReport>>(`/api/admin/price-reports/${id}/approve`, {
      volumeMl: volumeMl ?? null,
      storeType,
    }),

  reject: (id: number, rejectReason: string) =>
    axiosInstance.patch<ApiResponse<AdminPriceReport>>(`/api/admin/price-reports/${id}/reject`, {
      rejectReason,
    }),
}
