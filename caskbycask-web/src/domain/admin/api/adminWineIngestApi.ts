import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type {
  WineIngestDashboard, WineIngestItem, WineIngestRun, WineIngestSettings,
} from '../types/wineIngest.types'

export const adminWineIngestApi = {
  dashboard: async () => {
    const res = await axiosInstance.get<ApiResponse<WineIngestDashboard>>('/api/admin/wine-ingest/dashboard')
    return res.data.data!
  },
  settings: async () => {
    const res = await axiosInstance.get<ApiResponse<WineIngestSettings>>('/api/admin/wine-ingest/settings')
    return res.data.data!
  },
  updateSettings: async (data: Omit<WineIngestSettings, 'liveNetworkEnabled' | 'updatedAt'>) => {
    const res = await axiosInstance.put<ApiResponse<WineIngestSettings>>('/api/admin/wine-ingest/settings', data)
    return res.data.data!
  },
  runs: async (page = 0, size = 20) => {
    const res = await axiosInstance.get<ApiResponse<PageResponse<WineIngestRun>>>('/api/admin/wine-ingest/runs', {
      params: { page, size },
    })
    return res.data.data!
  },
  items: async (runId: number, page = 0, size = 50) => {
    const res = await axiosInstance.get<ApiResponse<PageResponse<WineIngestItem>>>(
      `/api/admin/wine-ingest/runs/${runId}/items`, { params: { page, size } },
    )
    return res.data.data!
  },
  createFixtureRun: async (limit = 3) => {
    const res = await axiosInstance.post<ApiResponse<WineIngestRun>>('/api/admin/wine-ingest/runs', {
      runType: 'FIXTURE', limit,
    })
    return res.data.data!
  },
  createManualRun: async (limit: number) => {
    const res = await axiosInstance.post<ApiResponse<WineIngestRun>>('/api/admin/wine-ingest/runs', {
      runType: 'MANUAL', limit,
    })
    return res.data.data!
  },
  cancel: async (runId: number) => {
    const res = await axiosInstance.post<ApiResponse<WineIngestRun>>(`/api/admin/wine-ingest/runs/${runId}/cancel`)
    return res.data.data!
  },
  publishItem: async (itemId: number) => {
    const res = await axiosInstance.post<ApiResponse<WineIngestItem>>(`/api/admin/wine-ingest/items/${itemId}/publish`)
    return res.data.data!
  },
}
