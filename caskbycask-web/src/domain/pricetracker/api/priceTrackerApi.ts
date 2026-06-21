import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  ChartResponse,
  CreatePriceReportRequest,
  PriceAlertResponse,
  PriceReportChartDetail,
  PriceReportImageUpload,
  PriceReportStatus,
  PriceReportSummary,
  StoreSearchResult,
  StoreType,
} from '../types/pricetracker.types'

function serializeParams(params: Record<string, unknown>): string {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined && v !== null && v !== '') usp.append(key, String(v))
      })
    } else {
      usp.append(key, String(value))
    }
  })
  return usp.toString()
}

export const priceTrackerApi = {
  // ── 차트 ────────────────────────────────────────
  getChart: (spiritId: number, storeType: StoreType, period: string, region?: string, spiritIds?: number[]) =>
    axiosInstance.get<ApiResponse<ChartResponse>>('/api/price-reports/chart', {
      params: { spiritId, spiritIds, storeType, period, region: region || undefined },
      paramsSerializer: serializeParams,
    }),

  getChartDetails: (spiritId: number, pointDate: string, storeType: StoreType, bucketType?: string, spiritIds?: number[]) =>
    axiosInstance.get<ApiResponse<PriceReportChartDetail[]>>(
      `/api/price-reports/chart/${pointDate}/details`,
      { params: { spiritId, spiritIds, storeType, bucketType }, paramsSerializer: serializeParams },
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

  // ── 내 가격 등록 ──────────────────────────────────
  getMyReports: (status: PriceReportStatus | undefined, page: number) =>
    axiosInstance.get<ApiResponse<PageResponse<PriceReportSummary>>>('/api/price-reports/my', {
      params: { status, page, size: 20 },
    }),

  deletePriceReport: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/api/price-reports/${id}`),

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
