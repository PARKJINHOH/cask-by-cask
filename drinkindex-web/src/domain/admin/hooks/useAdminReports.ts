import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminReportApi } from '../api/adminReportApi'
import type { ReportStatus, ReportTargetType } from '../types/admin.types'

interface ReportListParams {
  status?: ReportStatus
  targetType?: ReportTargetType
  page: number
}

export function useAdminReports(params: ReportListParams) {
  return useQuery({
    queryKey: ['admin-reports', params],
    queryFn: () =>
      adminReportApi.list({ ...params, size: 20 }).then((res) => res.data.data!),
  })
}

export function useResolveReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminReportApi.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
    },
  })
}

export function useDismissReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminReportApi.dismiss(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
    },
  })
}
