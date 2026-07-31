'use client'

import { useTranslation } from 'react-i18next'
import WineOriginMap from '@/domain/location/components/WineOriginMap'
import { useWineRegionCatalog } from '@/domain/location/hooks/useWineRegionCatalog'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'
import type { SpiritCategory, SpiritWineRegion } from '@/domain/spirit/types/spirit.types'

interface Props {
  /** 관리자가 선택한 산지 코드 (L1 또는 L2) */
  regionCode: string
  /** 산지 카탈로그 카테고리 — 미국처럼 와인/위스키 산지가 겹치는 국가를 구분한다 */
  category?: SpiritCategory
  className?: string
  /** 관리자 화면은 한국어 고정 */
  admin?: boolean
}

/**
 * 관리자 등록·수정 폼의 산지 지도 미리보기.
 *
 * 사용자 상세 페이지와 **같은 `WineOriginMap` 컴포넌트**를 그대로 써서,
 * 관리자가 저장 전에 실제 노출 형태를 확인하고 잘못 고른 산지를 잡을 수 있게 한다.
 * (선택기와 지도가 다른 컴포넌트라면 서로 어긋날 수 있으므로 재사용이 중요하다)
 */
export default function WineRegionPreview({
  regionCode, category = 'WINE', className, admin = true,
}: Props) {
  const { t } = useTranslation()
  const tr = (key: string) => t(key, admin ? { lng: 'ko' } : undefined)
  const { byCode, isLoading } = useWineRegionCatalog(true, category)

  const node = byCode.get(regionCode)
  if (isLoading || !node) return null

  const parent = node.parentCode ? byCode.get(node.parentCode) : undefined
  const wineRegion: SpiritWineRegion = {
    code: node.code,
    countryCode: node.countryCode,
    nameKo: node.nameKo,
    nameEn: node.nameEn,
    parentCode: node.parentCode,
    parentNameKo: parent?.nameKo ?? null,
    parentNameEn: parent?.nameEn ?? null,
  }

  const country = ISO3166_COUNTRIES.find((c) => c.code === node.countryCode)
  const countryLabel = country ? country.nameKo : node.countryCode

  return (
    <div className={className}>
      <p className="text-[11px] text-neutral-500 mb-1.5">{tr('spirit.detail.originMap.adminPreview')}</p>
      <WineOriginMap wineRegion={wineRegion} countryLabel={countryLabel} />
    </div>
  )
}
