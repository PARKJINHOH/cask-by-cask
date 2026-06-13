import { useQuery } from '@tanstack/react-query'
import { producerApi } from '../api/producerApi'
import type { ProducerType } from '../types/producer.types'

export function useProducerDetail(id: number) {
  return useQuery({
    queryKey: ['producer', id],
    queryFn: async () => {
      const res = await producerApi.findById(id)
      return res.data.data!
    },
    enabled: id > 0,
    staleTime: 60_000,
  })
}

export function useAllProducers(type?: ProducerType) {
  return useQuery({
    queryKey: ['producers', 'all', type],
    queryFn: async () => {
      const res = await producerApi.search({ type, size: 500 })
      return res.data.data?.content ?? []
    },
  })
}
