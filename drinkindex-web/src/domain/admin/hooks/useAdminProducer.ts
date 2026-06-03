import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminProducerApi } from '../api/adminProducerApi'
import type { CreateProducerPayload, UpdateProducerPayload, ProducerType } from '@/domain/producer/types/producer.types'

export interface ProducerFilters {
  nameKo?: string
  nameEn?: string
  country?: string
  foundedYear?: string
  type?: ProducerType | ''
}

export function useAdminProducers(filters: ProducerFilters, page: number, sort = 'id,desc') {
  return useQuery({
    queryKey: ['admin-producers', filters, page, sort],
    queryFn: () =>
      adminProducerApi
        .list({
          nameKo: filters.nameKo?.trim() || undefined,
          nameEn: filters.nameEn?.trim() || undefined,
          country: filters.country?.trim() || undefined,
          foundedYear: filters.foundedYear?.trim() ? Number(filters.foundedYear) : undefined,
          type: filters.type || undefined,
          page,
          size: 20,
          sort,
        })
        .then((r) => r.data.data!),
  })
}

export function useCreateProducer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProducerPayload) => adminProducerApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-producers'] })
      qc.invalidateQueries({ queryKey: ['producers'] })
    },
  })
}

export function useUpdateProducer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProducerPayload }) =>
      adminProducerApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-producers'] })
      qc.invalidateQueries({ queryKey: ['producers'] })
    },
  })
}

export function useDeleteProducer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminProducerApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-producers'] })
      qc.invalidateQueries({ queryKey: ['producers'] })
    },
  })
}
