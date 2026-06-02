import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type {
  ChartResponse,
  CreatePriceReportRequest,
  PriceAlertResponse,
  PriceReportChartDetail,
  PriceReportImageUpload,
  StoreSearchResult,
  StoreType,
} from '../types/pricetracker.types'

export const priceTrackerApi = {
  // ── 차트 ────────────────────────────────────────
  getChart: (spiritId: number, storeType: StoreType, period: string, region?: string) =>
    axiosInstance.get<ApiResponse<ChartResponse>>('/api/price-reports/chart', {
      params: { spiritId, storeType, period, region: region || undefined },
    }),

  getChartDetails: (spiritId: number, pointDate: string, storeType: StoreType) =>
    axiosInstance.get<ApiResponse<PriceReportChartDetail[]>>(
      `/api/price-reports/chart/${pointDate}/details`,
      { params: { spiritId, storeType } },
    ),

  // ── 가격 등록 ────────────────────────────────────
  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return axiosInstance.post<ApiResponse<PriceReportImageUpload>>(
      '/api/price-reports/images',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  createPriceReport: (data: CreatePriceReportRequest) =>
    axiosInstance.post<ApiResponse<unknown>>('/api/price-reports', data),

  // ── 신고 ─────────────────────────────────────────
  reportPriceReport: (
    reportId: number,
    body: { reason: string; reasonDetail?: string },
  ) => axiosInstance.post<ApiResponse<void>>(`/api/price-reports/${reportId}/reports`, body),

  // ── 매장 검색 ─────────────────────────────────────
  searchStores: (keyword: string, storeType?: StoreType) =>
    axiosInstance.get<ApiResponse<StoreSearchResult[]>>('/api/stores/search', {
      params: { keyword, storeType, limit: 10 },
    }),

  // ── 가격 알림 ─────────────────────────────────────
  upsertAlert: (spiritId: number, targetPrice: number) =>
    axiosInstance.post<ApiResponse<PriceAlertResponse>>('/api/price-alerts', {
      spiritId,
      targetPrice,
    }),

  getMyAlerts: () =>
    axiosInstance.get<ApiResponse<PriceAlertResponse[]>>('/api/price-alerts/me'),

  deleteAlert: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/price-alerts/${id}`),

  toggleAlert: (id: number) =>
    axiosInstance.patch<ApiResponse<PriceAlertResponse>>(`/api/price-alerts/${id}/toggle`),
}
