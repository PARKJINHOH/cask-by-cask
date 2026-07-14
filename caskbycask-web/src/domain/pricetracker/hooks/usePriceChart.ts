import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { priceTrackerApi } from '../api/priceTrackerApi'
import type { BucketType, PriceReportStatus, StoreType, VolumeSelection } from '../types/pricetracker.types'

export function usePriceChart(
  spiritId: number,
  storeType: StoreType,
  period: string,
  region?: string,
  spiritIds?: number[],
  volume?: VolumeSelection | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ['priceChart', spiritId, storeType, period, region, spiritIds, volume],
    queryFn: () => priceTrackerApi.getChart(spiritId, storeType, period, region, spiritIds, volume),
    select: (res) => res.data.data,
    enabled: !!spiritId && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePriceChartDetail(
  spiritId: number,
  pointDate: string | null,
  storeType: StoreType,
  bucketType?: BucketType,
  spiritIds?: number[],
  volume?: VolumeSelection | null,
) {
  return useQuery({
    queryKey: ['priceChartDetail', spiritId, pointDate, storeType, bucketType, spiritIds, volume],
    queryFn: () => priceTrackerApi.getChartDetails(spiritId, pointDate!, storeType, bucketType, spiritIds, volume),
    select: (res) => res.data.data,
    enabled: !!spiritId && !!pointDate,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMyPriceAlerts() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  return useQuery({
    queryKey: ['priceAlerts', 'me'],
    queryFn: () => priceTrackerApi.getMyAlerts(),
    select: (res) => res.data.data,
    enabled: isAuthReady && isLoggedIn,
  })
}

export function usePriceVolumeOptions(spiritId: number, storeType: StoreType, spiritIds?: number[]) {
  return useQuery({
    queryKey: ['priceVolumeOptions', spiritId, storeType, spiritIds],
    queryFn: () => priceTrackerApi.getVolumeOptions(spiritId, storeType, spiritIds),
    select: (res) => res.data.data ?? [],
    enabled: !!spiritId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpsertPriceAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ spiritId, volumeMl, targetPrice }: { spiritId: number; volumeMl: number; targetPrice: number }) =>
      priceTrackerApi.upsertAlert(spiritId, volumeMl, targetPrice),
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
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  return useQuery({
    queryKey: ['priceReports', 'my', status, page],
    queryFn: () => priceTrackerApi.getMyReports(status, page),
    select: (res) => res.data.data,
    staleTime: 30_000,
    enabled: isAuthReady && isLoggedIn,
  })
}

export function useDeleteMyPriceReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => priceTrackerApi.deletePriceReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priceReports', 'my'] }),
  })
}
