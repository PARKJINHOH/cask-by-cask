import { useMutation } from '@tanstack/react-query'
import { reportApi } from '../api/reportApi'
import type { CreateReportRequest } from '../types/report.types'

export function useCreateReport() {
  return useMutation({
    mutationFn: (data: CreateReportRequest) => reportApi.createReport(data),
  })
}
