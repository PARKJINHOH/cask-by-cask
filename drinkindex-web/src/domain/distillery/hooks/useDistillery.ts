import { useQuery } from '@tanstack/react-query'
import { distilleryApi } from '../api/distilleryApi'

export function useDistilleries(keyword: string) {
  return useQuery({
    queryKey: ['distilleries', keyword],
    queryFn: async () => {
      const res = await distilleryApi.search({ keyword, size: 20 })
      return res.data.data?.content ?? []
    },
    enabled: keyword.length > 0,
    staleTime: 60_000,
  })
}

export function useAllDistilleries() {
  return useQuery({
    queryKey: ['distilleries', 'all'],
    queryFn: async () => {
      const res = await distilleryApi.search({ size: 500 })
      return res.data.data?.content ?? []
    },
  })
}
