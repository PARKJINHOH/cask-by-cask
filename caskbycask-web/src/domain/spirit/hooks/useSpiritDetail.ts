import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { spiritApi } from '../api/spiritApi'
import { spiritSeoApi } from '../api/spiritSeoApi'
import type { CreateSpiritVariantRequest } from '../types/spirit.types'
import { appendWineVintageDisplay } from '../utils/spiritDisplayName'

export function formatSpiritName<T extends {
  nameKo: string
  nameEn: string
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  variantType?: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'VINTAGE' | 'NONE' | null
  variantValue?: string | null
  variantValueEn?: string | null
  category?: string | null
  vintageYear?: number | null
  vintageStatus?: 'VINTAGE' | 'NON_VINTAGE' | 'UNKNOWN' | null
  wineDetail?: { vintageStatus?: 'VINTAGE' | 'NON_VINTAGE' | 'UNKNOWN' | null } | null
}>(spirit: T): T {
  if (!spirit) return spirit
  const hasEdition = spirit.variantType && spirit.variantType !== 'NONE'
  const englishOnly = !spirit.nameKo?.trim()
    || spirit.nameKo.trim().toLocaleLowerCase() === spirit.nameEn?.trim().toLocaleLowerCase()
  let nameKo = spirit.nameKo
  let nameEn = spirit.nameEn
  if (hasEdition) {
    nameKo = formatEditionDisplayName(
      spirit.nameKo,
      spirit.seriesIdentifier,
      spirit.variantValue,
    )
    const nameEnBase = spirit.nameEn || spirit.nameKo
    const valEn = spirit.variantValueEn || spirit.variantValue
    nameEn = formatEditionDisplayName(
      nameEnBase,
      spirit.seriesIdentifierEn || spirit.seriesIdentifier,
      valEn,
    )
  }
  const vintageSource = {
    category: spirit.category,
    vintageYear: spirit.vintageYear,
    vintageStatus: spirit.vintageStatus ?? spirit.wineDetail?.vintageStatus,
  }
  const formattedKo = appendWineVintageDisplay(nameKo, vintageSource)
  const formattedEn = appendWineVintageDisplay(nameEn || nameKo, vintageSource)
  return {
    ...spirit,
    nameKo: englishOnly ? formattedEn : formattedKo,
    nameEn: formattedEn,
  }
}

function formatEditionDisplayName(
  name: string | null | undefined,
  seriesIdentifier: string | null | undefined,
  variantValue: string | null | undefined,
) {
  return [name, seriesIdentifier, variantValue]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}

export function useSpiritDetail(id: number, preservePrevious = true) {
  return useQuery({
    queryKey: ['spirit', id],
    queryFn: () => spiritApi.getDetail(id).then((res) => formatSpiritName(res.data.data!)),
    enabled: !!id,
    placeholderData: preservePrevious ? keepPreviousData : undefined,
  })
}

export function useSpiritSeo(id: number) {
  return useQuery({
    queryKey: ['spiritSeo', id],
    queryFn: () => spiritSeoApi.getSeo(id).then((res) => res.data.data!),
    enabled: !!id,
    staleTime: 1000 * 60 * 30,
  })
}

/** 같은 이름의 다른 배치·병입 제품 목록 */
export function useSpiritVariants(id: number) {
  return useQuery({
    queryKey: ['spirit', id, 'variants'],
    queryFn: () => spiritApi.getVariants(id).then((res) => (res.data.data ?? []).map((v) => formatSpiritName(v))),
    enabled: !!id,
  })
}

export function useCreateSpiritVariant(masterId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSpiritVariantRequest) => spiritApi.createVariant(masterId, data),
    onSuccess: (res) => {
      const variant = res.data.data
      queryClient.invalidateQueries({ queryKey: ['spirit', masterId] })
      queryClient.invalidateQueries({ queryKey: ['spirit', masterId, 'variants'] })
      if (variant?.id) {
        queryClient.invalidateQueries({ queryKey: ['spirit', variant.id] })
      }
    },
  })
}
