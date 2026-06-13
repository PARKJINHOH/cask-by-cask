import { useQuery } from '@tanstack/react-query'
import { adminLogApi } from '../api/adminLogApi'
import type { AdminLogSearchParams } from '../types/admin.types'

export function useAdminLogs(params: AdminLogSearchParams) {
  return useQuery({
    queryKey: ['admin-logs', params],
    queryFn: () => adminLogApi.getLogs(params).then((res) => res.data.data!),
  })
}
