import type { SpiritDetail, SpiritVariantType } from '../types/spirit.types'

/**
 * 마스터 주류가 이미 갖고 있는 에디션 구분 정보.
 *
 * <p>「기존 주류에 에디션 추가」에서 사용자는 **식별값만** 적는다. 에디션 유형과 시리즈 식별자는
 * 붙일 마스터에서 물려받아야 승인 결과와 화면이 어긋나지 않는다.
 */
export interface MasterEditionInfo {
  /** 유형·시리즈 식별자를 이미 정한 주류인가 (이미 하위 에디션이 갈려 있는가) */
  hasEditions: boolean
  /** 에디션 유형 — 'NONE' 은 null 로 정규화한다 */
  variantType: SpiritVariantType | null
  seriesIdentifier: string | null
  seriesIdentifierEn: string | null
}

export const EMPTY_MASTER_EDITION: MasterEditionInfo = {
  hasEditions: false,
  variantType: null,
  seriesIdentifier: null,
  seriesIdentifierEn: null,
}

const normalize = (value?: string | null): string | null => {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

const normalizeType = (value?: SpiritVariantType | null): SpiritVariantType | null =>
  value && value !== 'NONE' ? value : null

/**
 * 마스터 상세에서 에디션 구분 정보를 뽑는다.
 *
 * <p>마스터 자신의 값을 먼저 보고, 없으면 하위 에디션에서 처음 발견되는 값을 쓴다 —
 * 서버의 `resolveVariantTypeForUserCreate` / `resolveSeriesIdentifierForUserCreate`
 * (SpiritService.java) 와 **같은 규칙**이다. 규칙이 갈리면 화면에는 상속된 것처럼 보이는데
 * 승인 시점에 다른 값이 붙는다.
 */
export function deriveMasterEditionInfo(detail: SpiritDetail | null | undefined): MasterEditionInfo {
  if (!detail) return EMPTY_MASTER_EDITION

  const children = detail.variants ?? []
  const variantType = normalizeType(detail.variantType)
    ?? children.map((v) => normalizeType(v.variantType)).find((v) => v != null)
    ?? null
  const seriesIdentifier = normalize(detail.seriesIdentifier)
    ?? children.map((v) => normalize(v.seriesIdentifier)).find((v) => v != null)
    ?? null
  const seriesIdentifierEn = normalize(detail.seriesIdentifierEn)
    ?? children.map((v) => normalize(v.seriesIdentifierEn)).find((v) => v != null)
    ?? seriesIdentifier

  return {
    // 유형과 시리즈 식별자가 모두 있어야 승인 시 그대로 상속된다.
    // 하나라도 비면 관리자가 승인 화면에서 확정해야 한다(promoteToVariantMaster).
    hasEditions: variantType != null && seriesIdentifier != null,
    variantType,
    seriesIdentifier,
    seriesIdentifierEn,
  }
}
