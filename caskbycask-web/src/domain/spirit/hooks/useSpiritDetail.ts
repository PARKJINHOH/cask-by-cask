import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { spiritApi } from '../api/spiritApi'
import { spiritSeoApi } from '../api/spiritSeoApi'

export function formatSpiritName<T extends {
  nameKo: string
  nameEn: string
  variantType?: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'NONE' | null
  variantValue?: string | null
  variantValueEn?: string | null
}>(spirit: T): T {
  if (!spirit) return spirit
  const hasEdition = spirit.variantType && spirit.variantType !== 'NONE'
  if (hasEdition) {
    let nameKo = spirit.nameKo
    let nameEn = spirit.nameEn
    if (spirit.variantValue && spirit.variantValue.trim()) {
      nameKo = `${spirit.nameKo} ${spirit.variantValue.trim()}`
    }
    const valEn = spirit.variantValueEn || spirit.variantValue
    if (valEn && valEn.trim()) {
      nameEn = spirit.nameEn 
        ? `${spirit.nameEn} ${valEn.trim()}` 
        : valEn.trim()
    }
    return {
      ...spirit,
      nameKo,
      nameEn,
    }
  }
  return spirit
}

export function useSpiritDetail(id: number) {
  return useQuery({
    queryKey: ['spirit', id],
    queryFn: () => spiritApi.getDetail(id).then((res) => formatSpiritName(res.data.data!)),
    enabled: !!id,
    placeholderData: keepPreviousData,
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
