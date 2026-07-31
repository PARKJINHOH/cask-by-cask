import { useTranslation } from 'react-i18next'
import { useWineRegionCatalog } from '@/domain/location/hooks/useWineRegionCatalog'
import { resolveL2Change, resolveRegionSelection, topLevelOf } from '@/domain/location/data/wineRegionSelection'
import type { RegionNode } from '@/domain/location/data/wineRegionSelection'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

interface Props {
  /** ISO 3166-1 alpha-2 국가 코드 */
  countryCode: string | null
  /** 현재 선택된 산지 코드 (L1 또는 L2). 미지정 시 null */
  regionCode: string | null
  /** 산지 코드 변경 — 함께 전달되는 L1 이름으로 지역 텍스트도 맞춘다 */
  onChange: (code: string | null, l1NameKo: string, l1NameEn: string) => void
  disabled?: boolean
  /** 산지 카탈로그 카테고리 — 미국·호주처럼 와인/위스키 산지가 겹치는 국가를 구분한다 */
  category?: SpiritCategory
  /** 관리자 화면은 한국어 고정 */
  admin?: boolean
}

const SELECT =
  'w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-400 ' +
  'disabled:bg-neutral-50 disabled:text-neutral-400'

/**
 * 와인 산지 2단 선택기 (L1 대산지 → L2 세부산지).
 *
 * <p>산지 목록은 백엔드 `GET /api/wine-regions` 가 단일 소스다. 선택 결과는 산지 코드
 * (예: `FR_BORDEAUX_MEDOC`)로 저장되며, 사용자 상세 페이지의 산지 지도가 이 코드로
 * 국가 지도와 확대 지도의 하이라이트 대상을 찾는다.
 *
 * <p>L2 는 선택 사항이다 — L1 만 고르면 국가 지도만, L2 까지 고르면 확대 지도까지 표시된다.
 */
export default function WineRegionSelector({
  countryCode, regionCode, onChange, disabled, category = 'WINE', admin = false,
}: Props) {
  const { t, i18n } = useTranslation()
  const tr = (key: string, opts?: Record<string, unknown>) =>
    t(key, admin ? { lng: 'ko', ...(opts ?? {}) } : opts)
  const isEn = !admin && i18n.language === 'en'
  const label = (node: RegionNode) => (isEn ? node.nameEn : node.nameKo)

  const { topLevelsOf, byCode, isLoading, isError } = useWineRegionCatalog(!!countryCode, category)
  const topLevels = topLevelsOf(countryCode)
  const { l1Code, l2Code, l1, subRegions } = resolveRegionSelection(regionCode, byCode)

  /** 코드 변경을 상위로 전달 — 지역 텍스트 동기화를 위해 L1 이름도 함께 넘긴다 */
  const emit = (code: string | null) => {
    const top = topLevelOf(code, byCode)
    onChange(code, top?.nameKo ?? '', top?.nameEn ?? '')
  }

  if (isLoading) {
    return (
      <div className={`${SELECT} text-neutral-400`} aria-live="polite">
        {tr('location.wineRegion.loading')}
      </div>
    )
  }
  if (isError) {
    return (
      <div className={`${SELECT} text-red-500`} role="alert">
        {tr('location.wineRegion.loadError')}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
      {/* L1 대산지 */}
      <select
        className={SELECT}
        value={l1Code}
        disabled={disabled || !countryCode}
        aria-label={tr('location.wineRegion.selectL1')}
        onChange={(e) => {
          const code = e.target.value
          emit(code || null)
        }}
      >
        <option value="">{tr('location.wineRegion.selectL1')}</option>
        {topLevels.map((node) => (
          <option key={node.code} value={node.code}>{label(node)}</option>
        ))}
      </select>

      {/* L2 세부산지 — L1 에 하위 산지가 있을 때만 노출 */}
      {subRegions.length > 0 && (
        <select
          className={SELECT}
          value={l2Code}
          disabled={disabled}
          aria-label={tr('location.wineRegion.selectL2')}
          onChange={(e) => emit(resolveL2Change(e.target.value, l1Code))}
        >
          <option value="">
            {l1 ? tr('location.wineRegion.wholeL1', { name: label(l1) }) : tr('location.wineRegion.selectL2')}
          </option>
          {subRegions.map((node) => (
            <option key={node.code} value={node.code}>{label(node)}</option>
          ))}
        </select>
      )}
    </div>
  )
}
