import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  AdminPriceReport,
  AdminStore,
  DutyFreeChannel,
  PriceReportStatus,
  StoreAlias,
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

  approve: (id: number, storeId?: number | null) =>
    axiosInstance.patch<ApiResponse<AdminPriceReport>>(`/api/admin/price-reports/${id}/approve`, {
      storeId: storeId ?? null,
    }),

  reject: (id: number, rejectReason: string) =>
    axiosInstance.patch<ApiResponse<AdminPriceReport>>(`/api/admin/price-reports/${id}/reject`, {
      rejectReason,
    }),

  // ── 매장 관리 ────────────────────────────────────
  getStores: (params: { keyword?: string; isApproved?: boolean; page: number }) =>
    axiosInstance.get<ApiResponse<PageResponse<AdminStore>>>('/api/admin/stores', {
      params: { keyword: params.keyword || undefined, isApproved: params.isApproved, page: params.page, size: 20 },
    }),

  createStore: (body: { displayName: string; storeType: StoreType; dutyfreeChannel?: DutyFreeChannel | null; region?: string | null }) =>
    axiosInstance.post<ApiResponse<AdminStore>>('/api/admin/stores', body),

  approveStore: (id: number) =>
    axiosInstance.patch<ApiResponse<AdminStore>>(`/api/admin/stores/${id}/approve`),

  deleteStore: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/admin/stores/${id}`),

  getAliases: (id: number) =>
    axiosInstance.get<ApiResponse<StoreAlias[]>>(`/api/admin/stores/${id}/aliases`),

  addAlias: (id: number, alias: string) =>
    axiosInstance.post<ApiResponse<StoreAlias>>(`/api/admin/stores/${id}/aliases`, { alias }),

  deleteAlias: (aliasId: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/admin/stores/aliases/${aliasId}`),

  mergeStore: (suggestedId: number, targetStoreId: number) =>
    axiosInstance.patch<ApiResponse<void>>(`/api/admin/stores/${suggestedId}/merge`, { targetStoreId }),
}
