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
 */
export const BROAD_CASK_CATEGORIES = [
  { code: 'EX_BOURBON', label: '버번 캐스크 (Bourbon Cask)', placeholder: '예) 버진 오크, 아메리칸 오크' },
  { code: 'NEW_OAK', label: '버진 오크 (Virgin Oak / New Oak)', placeholder: '예) 아메리칸 버진 오크' },
  { code: 'EX_SHERRY', label: '셰리 캐스크 (Sherry Cask)', placeholder: '예) 올로로소, PX, 피노, 만자니야' },
  { code: 'EX_PORT', label: '포트/주정강화 캐스크 (Fortified Wine Cask)', placeholder: '예) 포트, 마데이라, 소테른, 마르살라' },
  { code: 'EX_WINE', label: '와인 캐스크 (Wine Cask)', placeholder: '예) 레드 와인, 샤르도네, 비노 바리끄' },
  { code: 'EX_RUM', label: '럼 캐스크 (Rum Cask)', placeholder: '예) 다크 럼, 화이트 럼' },
  { code: 'EX_COGNAC', label: '꼬냑 캐스크 (Cognac Cask)', placeholder: '예) 그랑 상파뉴 꼬냑' },
  { code: 'EX_CALVADOS', label: '칼바도스 캐스크 (Calvados Cask)', placeholder: '예) 칼바도스' },
  { code: 'EX_BEER', label: '맥주 캐스크 (Beer Cask)', placeholder: '예) 임페리얼 스타우트, IPA' },
  { code: 'MIZUNARA', label: '미즈나라 캐스크 (Mizunara Cask)', placeholder: '예) 미즈나라' },
  { code: 'OTHER', label: '기타 캐스크 (Other Casks)', placeholder: '예) 매실주 캐스크, 피티드 캐스크' },
]

/** 병입 구분 — OB(증류소 직접) / IB(독립 병입사) */
export const BOTTLING_TYPES = ['OB', 'IB'] as const

/** 하위 에디션 유형 — 정규 제품(NONE)은 에디션 분리를 쓰지 않는다 */
export const VARIANT_TYPES = ['BATCH', 'SINGLE_CASK', 'RELEASE_YEAR'] as const
