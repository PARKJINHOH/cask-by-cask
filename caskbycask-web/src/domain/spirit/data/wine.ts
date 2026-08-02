/**
 * 와인 종류·인증·재배/양조 선택지.
 *
 * 값의 단일 소스는 백엔드 `WineType`·`WineCertification` enum 이다.
 * 수확 방법·발효 용기는 enum 이 아니라 자유 문자열 컬럼이지만 폼이 **드롭다운**이라,
 * 여기 있는 문자열과 정확히 같지 않으면 화면에서 선택되지 않는다.
 *
 * 컴포넌트(.tsx)가 아니라 여기(.ts)에 두는 이유: 테스트가 JSX 를 로드하지 않고 이 목록만 읽는다.
 */

export const WINE_TYPES: Array<[string, string]> = [
  ['RED', '레드'], ['WHITE', '화이트'], ['ROSE', '로제'], ['SPARKLING', '스파클링'],
  ['DESSERT', '디저트'], ['ORANGE', '오렌지'], ['FORTIFIED', '주정강화'],
]

export const CERTIFICATIONS: Array<[string, string]> = [
  ['NONE', '없음'], ['ORGANIC', 'Organic'], ['BIODYNAMIC', 'Biodynamic'], ['SUSTAINABLE', 'Sustainable'],
]

export const HARVEST_METHODS = ['Hand-picked', 'Machine-harvested']

export const FERMENTATION_VESSELS = ['Stainless Steel', 'Concrete', 'Oak Vat', 'Amphora']

/** 오크 종류는 datalist 제안일 뿐 자유 입력이다 (슬라보니안·아카시아 등도 들어온다) */
export const WINE_OAK_TYPES = ['French Oak', 'American Oak', 'Hungarian Oak']

export const WINE_VINTAGE_STATUSES = ['VINTAGE', 'NON_VINTAGE', 'UNKNOWN'] as const
