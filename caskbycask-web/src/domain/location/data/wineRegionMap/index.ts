import type { CountryMap } from './types'

/**
 * 국가 코드 → 산지 지도 기하 데이터 **로더**.
 *
 * 지도 데이터는 정밀도를 우선해 국가당 수백 KB 규모다. 상세 페이지의 핵심 정보보다
 * 뒤에 와도 무방한 보조 시각 자료이므로, 각 국가 파일을 **동적 import 로 분리**해
 * 지도 카드가 화면에 들어올 때 해당 국가 것만 내려받는다.
 * → 초기 번들·초기 렌더에 영향을 주지 않으면서 형상 정밀도를 최대한 유지한다.
 *
 * 여기에 없는 국가는 산지 지도를 표시하지 않는다(그레이스풀 폴백) — 백엔드 카탈로그에
 * 산지가 있어도 기하 데이터가 아직 없으면 기존 텍스트 표기만 남는다.
 * 국가를 추가할 때는 `npm run map:build` 로 생성한 파일을 여기에 등록한다.
 */
export const WINE_REGION_MAP_LOADERS: Record<string, () => Promise<CountryMap>> = {
  // ── 와인 ───────────────────────────────────────────────
  FR: () => import('./fr').then((m) => m.FR_MAP),
  US: () => import('./us').then((m) => m.US_MAP),
  IT: () => import('./it').then((m) => m.IT_MAP),
  ES: () => import('./es').then((m) => m.ES_MAP),
  CL: () => import('./cl').then((m) => m.CL_MAP),
  AU: () => import('./au').then((m) => m.AU_MAP),
  PT: () => import('./pt').then((m) => m.PT_MAP),
  DE: () => import('./de').then((m) => m.DE_MAP),
  AT: () => import('./at').then((m) => m.AT_MAP),
  HU: () => import('./hu').then((m) => m.HU_MAP),
  NZ: () => import('./nz').then((m) => m.NZ_MAP),
  AR: () => import('./ar').then((m) => m.AR_MAP),
  ZA: () => import('./za').then((m) => m.ZA_MAP),
  // ── 위스키 (US·AU 는 위 와인 지도를 그대로 재사용한다) ──
  'GB-SCT': () => import('./gb-sct').then((m) => m.GB_SCT_MAP),
  'GB-ENG': () => import('./gb-eng').then((m) => m.GB_ENG_MAP),
  'GB-WLS': () => import('./gb-wls').then((m) => m.GB_WLS_MAP),
  'GB-NIR': () => import('./gb-nir').then((m) => m.GB_NIR_MAP),
  IE: () => import('./ie').then((m) => m.IE_MAP),
  JP: () => import('./jp').then((m) => m.JP_MAP),
  TW: () => import('./tw').then((m) => m.TW_MAP),
  KR: () => import('./kr').then((m) => m.KR_MAP),
  IN: () => import('./in').then((m) => m.IN_MAP),
  CA: () => import('./ca').then((m) => m.CA_MAP),
  SE: () => import('./se').then((m) => m.SE_MAP),
  NL: () => import('./nl').then((m) => m.NL_MAP),
  DK: () => import('./dk').then((m) => m.DK_MAP),
  FI: () => import('./fi').then((m) => m.FI_MAP),
  IL: () => import('./il').then((m) => m.IL_MAP),
  // ── 와인 추가국 ─────────────────────────────────────────
  CN: () => import('./cn').then((m) => m.CN_MAP),
  GR: () => import('./gr').then((m) => m.GR_MAP),
  GE: () => import('./ge').then((m) => m.GE_MAP),
  LB: () => import('./lb').then((m) => m.LB_MAP),
  UY: () => import('./uy').then((m) => m.UY_MAP),
}

/** 산지 지도 기하 데이터가 있는 국가인지 — 데이터를 내려받지 않고 동기 판정 */
export function hasWineRegionMap(countryCode: string | null | undefined): boolean {
  return !!countryCode && countryCode in WINE_REGION_MAP_LOADERS
}

export type { CountryMap, ZoomMap, RegionShape } from './types'
