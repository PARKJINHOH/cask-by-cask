import { useQuery } from '@tanstack/react-query'
import { noticeApi } from '../api/noticeApi'

export function useNoticeDetail(id: number | null) {
  return useQuery({
    queryKey: ['notices', 'detail', id],
    queryFn: () => noticeApi.getDetail(id!).then((r) => r.data.data!),
    enabled: id != null,
    staleTime: 5 * 60 * 1000,
  })
}
