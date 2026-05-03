import axiosInstance from '@/shared/api/axiosInstance'
import type { CreateReportRequest } from '../types/report.types'

export const reportApi = {
  createReport: (data: CreateReportRequest) =>
    axiosInstance.post('/api/reports', data),
}
