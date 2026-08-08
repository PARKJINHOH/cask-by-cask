/**
 * 위스키 스타일·캐스크 대분류 목록.
 *
 * 값의 단일 소스는 백엔드 `WhiskyStyle` enum 과 `spirit_whisky_detail.extra_data` 의 캐스크 코드다.
 * 등록 폼과 JSON 붙여넣기 입력(`spiritResearchJson`)이 같은 목록을 참조해야
 * "폼에는 있는데 붙여넣기는 거부하는" 값이 생기지 않는다.
 *
 * 컴포넌트(.tsx)가 아니라 여기(.ts)에 두는 이유: 테스트가 JSX 를 로드하지 않고 이 목록만 읽는다.
 */

export const WHISKY_STYLES: Array<[string, string]> = [
  ['SINGLE_MALT', '싱글 몰트'],
  ['BLENDED_MALT', '블렌디드 몰트'],
  ['BLENDED_WHISKY', '블렌디드'],
  ['BOURBON', '버번'],
  ['WHEATED_BOURBON', '밀 버번'],
  ['TENNESSEE', '테네시'],
  ['RYE', '라이'],
  ['POT_STILL', '싱글 팟 스틸'],
  ['GRAIN_CORN', '그레인 / 콘'],
  ['OTHER', '기타'],
]

/**
 * 캐스크 대분류 11종.
 *
 * 세부 오크통 명칭(퍼스트필·올로로소 등)은 대분류마다 자유 입력으로 여러 개 넣는다 —
 * 종류가 사실상 무한해 enum 으로 고정할 수 없기 때문이다.
 *
 * **세부 명칭은 영문으로 입력한다.** 이 값은 상세 화면에서 한글·영문 구분 없이 그대로 노출돼
 * (`SpiritDetailPage` 의 캐스크 칩) 언어별 번역본이 없다. 조사 프롬프트
 * (`docs/whisky-research-prompt.md`)도 영문을 요구하므로, 손으로 넣은 값과 붙여넣은 값이
 * 섞이지 않도록 placeholder 예시를 영문으로 둔다.
 */
export const BROAD_CASK_CATEGORIES = [
  { code: 'EX_BOURBON', label: '버번 캐스크 (Bourbon Cask)', placeholder: '예) American Oak Barrel, First-fill Bourbon Barrel' },
  { code: 'NEW_OAK', label: '버진 오크 (Virgin Oak / New Oak)', placeholder: '예) American Virgin Oak' },
  { code: 'EX_SHERRY', label: '셰리 캐스크 (Sherry Cask)', placeholder: '예) Oloroso Sherry Butt, Pedro Ximénez Hogshead' },
  { code: 'EX_PORT', label: '포트/주정강화 캐스크 (Fortified Wine Cask)', placeholder: '예) Port Pipe, Madeira Cask, Sauternes Barrique' },
  { code: 'EX_WINE', label: '와인 캐스크 (Wine Cask)', placeholder: '예) Red Wine Barrique, Chardonnay Cask' },
  { code: 'EX_RUM', label: '럼 캐스크 (Rum Cask)', placeholder: '예) Ex-Rum Cask, Jamaican Rum Cask' },
  { code: 'EX_COGNAC', label: '꼬냑 캐스크 (Cognac Cask)', placeholder: '예) Cognac Cask, Grande Champagne Cognac Cask' },
  { code: 'EX_CALVADOS', label: '칼바도스 캐스크 (Calvados Cask)', placeholder: '예) Calvados Cask' },
  { code: 'EX_BEER', label: '맥주 캐스크 (Beer Cask)', placeholder: '예) Imperial Stout Cask, IPA Cask' },
  { code: 'MIZUNARA', label: '미즈나라 캐스크 (Mizunara Cask)', placeholder: '예) Mizunara Puncheon' },
  { code: 'OTHER', label: '기타 캐스크 (Other Casks)', placeholder: '예) Umeshu Cask, Peated Quarter Cask' },
]

/** 병입 구분 — OB(증류소 직접) / IB(독립 병입사) */
export const BOTTLING_TYPES = ['OB', 'IB'] as const

/** 하위 에디션 유형 — 정규 제품(NONE)은 에디션 분리를 쓰지 않는다 */
export const VARIANT_TYPES = ['BATCH', 'SINGLE_CASK', 'RELEASE_YEAR'] as const
