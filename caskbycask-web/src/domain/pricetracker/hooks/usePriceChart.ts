import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { priceTrackerApi } from '../api/priceTrackerApi'
import type { PriceReportStatus, StoreType } from '../types/pricetracker.types'

export function usePriceChart(
  spiritId: number,
  storeType: StoreType,
  period: string,
  region?: string,
) {
  return useQuery({
    queryKey: ['priceChart', spiritId, storeType, period, region],
    queryFn: () => priceTrackerApi.getChart(spiritId, storeType, period, region),
    select: (res) => res.data.data,
    enabled: !!spiritId,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePriceChartDetail(
  spiritId: number,
  pointDate: string | null,
  storeType: StoreType,
) {
  return useQuery({
    queryKey: ['priceChartDetail', spiritId, pointDate, storeType],
    queryFn: () => priceTrackerApi.getChartDetails(spiritId, pointDate!, storeType),
    select: (res) => res.data.data,
    enabled: !!spiritId && !!pointDate,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMyPriceAlerts() {
  return useQuery({
    queryKey: ['priceAlerts', 'me'],
    queryFn: () => priceTrackerApi.getMyAlerts(),
    select: (res) => res.data.data,
  })
}

export function useUpsertPriceAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ spiritId, targetPrice }: { spiritId: number; targetPrice: number }) =>
      priceTrackerApi.upsertAlert(spiritId, targetPrice),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priceAlerts'] }),
  })
}

export function useDeletePriceAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => priceTrackerApi.deleteAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priceAlerts'] }),
  })
}

export function useTogglePriceAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => priceTrackerApi.toggleAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priceAlerts'] }),
  })
}

export function useMyPriceReports(status: PriceReportStatus | undefined, page: number) {
  return useQuery({
    queryKey: ['priceReports', 'my', status, page],
    queryFn: () => priceTrackerApi.getMyReports(status, page),
    select: (res) => res.data.data,
    staleTime: 30_000,
  })
}

export function useDeleteMyPriceReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => priceTrackerApi.deletePriceReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priceReports', 'my'] }),
  })
}
