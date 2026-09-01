import { REVIEW_NOTE_MIN_LENGTH, REVIEW_TEXT_MAX_LENGTH } from '../constants/reviewLimits'

/**
 * 다른 커뮤니티에 써 둔 자기 리뷰 본문을 향·맛·피니시·총평·점수 칸으로 나누는 규칙 파서.
 *
 * <b>저장하지 않는다. 폼 입력칸에 넣을 값만 만든다.</b> 확인·수정·저장은 사람이 한다.
 *
 * 라벨 사전과 예외 규칙은 전부 <b>디시인사이드 위스키 갤러리·아카라이브 주류 채널의
 * 실제 리뷰 15종</b>에서 관측한 형태다. 추측으로 넣은 규칙은 없다 —
 * 규칙을 늘릴 때도 실제 글을 먼저 확인하고 `scripts/review-import-parser.test.mjs` 의
 * 픽스처에 원문을 남길 것. 픽스처 없는 규칙은 다음 사람이 지워도 되는지 알 수 없다.
 *
 * 문구는 여기서 만들지 않는다. EN 화면에 한국어가 남지 않도록 `code` 만 돌려주고
 * 번역은 카드 컴포넌트가 `t('review.import.*')` 로 한다.
 */

export type ImportOutcome = 'ok' | 'comparison' | 'unlabeled'

/** 경고·적용 내역이 가리키는 폼 위치. */
export type ImportField = 'nose' | 'taste' | 'finish' | 'comment' | 'score' | 'general'

export interface ImportWarning {
  field: ImportField
  code: string
  params?: Record<string, string | number>
}

export interface ReviewImportPlan {
  outcome: ImportOutcome
  /** outcome 이 ok 가 아닐 때 왜 그렇게 판정했는지 (번역키 꼬리표) */
  reason?: string
  noseNote: string
  tasteNote: string
  finishNote: string
  /** 평문. 폼에 넣기 직전에 reviewCommentToHtml() 을 통과시킨다. */
  comment: string
  noseScore: number | null
  tasteScore: number | null
  finishScore: number | null
  applied: ImportField[]
  warnings: ImportWarning[]
}

export interface ParseContext {
  /** 게시글 제목 — 링크로 가져온 경우에만 있다. 비교 리뷰 판정에 함께 쓴다. */
  title?: string
  /** 지금 리뷰를 쓰는 주류 이름 (불일치 경고용) */
  spiritName?: string
}

// ── 라벨 사전 ────────────────────────────────────────────────────

type Section = 'NOSE' | 'PALATE' | 'FINISH' | 'OVERALL' | 'SCORE' | 'IGNORE'

/** 향·맛·피니시 — 리뷰 폼의 노트 세 칸에 대응하는 구간. 화면에 보이는 순서다. */
const PHASE_ORDER = ['NOSE', 'PALATE', 'FINISH'] as const
const PHASE_SECTIONS: ReadonlySet<Section> = new Set<Section>(PHASE_ORDER)
/** 구간 → 폼 위치. 경고를 어느 칸 옆에 보여 줄지 정한다. */
const PHASE_FIELD: Record<(typeof PHASE_ORDER)[number], ImportField> = {
  NOSE: 'nose', PALATE: 'taste', FINISH: 'finish',
}

interface LabelDef {
  text: string
  section: Section
  /**
   * 구분자 없이 본문이 바로 붙어도 라벨로 인정할지.
   *
   * `총평진을 많이 안먹어본 입장에서` 처럼 붙여 쓰는 글이 실제로 있다(아카라이브 진 리뷰).
   * 다만 한 글자 라벨에 이걸 켜면 `향긋한`·`맛있다`가 전부 라벨이 되므로,
   * 붙여 쓴 사례가 실제로 관측된 여러 글자 라벨에만 허용한다.
   */
  glued?: boolean
  /** 같은 구간을 가리키는 확실한 라벨이 없을 때만 채택 — 오탐이 큰 라벨용 */
  weak?: boolean
}

const LABELS: LabelDef[] = [
  // 향 — 영문 라벨은 굵은 글씨 뒤에 본문이 곧바로 붙는 글이 있어(`Nose전체적으로 발향이 약하다`)
  //      glued 를 켠다. 한 글자 라벨(N/P/F)에는 켜지 않는다.
  { text: 'Nose', section: 'NOSE', glued: true },
  { text: '노즈', section: 'NOSE' },
  { text: '노징', section: 'NOSE' },
  { text: '아로마', section: 'NOSE' },
  { text: 'Aroma', section: 'NOSE' },
  { text: '향기', section: 'NOSE' },
  { text: '향', section: 'NOSE' },
  { text: '코', section: 'NOSE' },
  { text: 'N', section: 'NOSE' },
  // 맛
  { text: 'Palate', section: 'PALATE', glued: true },
  { text: 'Palete', section: 'PALATE' },   // 실제로 자주 보이는 오타
  { text: 'Taste', section: 'PALATE' },
  { text: '팔레이트', section: 'PALATE' },
  { text: '팔레트', section: 'PALATE' },
  { text: '테이스트', section: 'PALATE' },
  { text: '미각', section: 'PALATE' },
  { text: '구개', section: 'PALATE' },
  { text: '맛', section: 'PALATE' },
  { text: '혀', section: 'PALATE' },
  { text: '입', section: 'PALATE' },
  { text: 'T', section: 'PALATE' },
  // 아마하간 리뷰가 팔레트 자리에 `노트 :` 를 썼다. 향 노트 나열과 헷갈려 weak 로 둔다.
  { text: '노트', section: 'PALATE', weak: true },
  { text: 'P', section: 'PALATE' },
  // 피니시
  // 한글 라벨에는 glued 를 켜지 않는다 — `피니시에서도`·`팔레트가` 처럼 조사가 붙은
  // 본문 첫머리가 통째로 라벨이 된다. `(피니쉬)피니쉬는 …` 은 닫는 괄호가 구분자라 이미 잡힌다.
  { text: 'Finish', section: 'FINISH', glued: true },
  { text: '피니쉬', section: 'FINISH' },
  { text: '피니시', section: 'FINISH' },
  { text: '여운', section: 'FINISH' },
  { text: '후미', section: 'FINISH' },
  { text: '끝맛', section: 'FINISH' },
  { text: '뒷맛', section: 'FINISH' },
  { text: '애프터', section: 'FINISH' },
  { text: '끝', section: 'FINISH' },
  // `목 넘김 및 여운:` 처럼 목넘김과 묶어 쓰는 사람이 있다. 조사가 붙은 `목넘김도 부드럽다`는
  // glued 를 켜지 않아 걸리지 않는다.
  { text: '목 넘김 및 여운', section: 'FINISH' },
  { text: '목넘김 및 여운', section: 'FINISH' },
  { text: '목 넘김', section: 'FINISH' },
  { text: '목넘김', section: 'FINISH' },
  { text: 'F', section: 'FINISH' },
  // 총평
  { text: '종합 평가', section: 'OVERALL', glued: true },
  { text: '종합평가', section: 'OVERALL', glued: true },
  { text: '총평가', section: 'OVERALL', glued: true },
  { text: '한줄평', section: 'OVERALL', glued: true },
  { text: '총평', section: 'OVERALL', glued: true },
  { text: '결론', section: 'OVERALL', glued: true },
  { text: '종합', section: 'OVERALL' },
  { text: '마무리', section: 'OVERALL' },
  { text: '소감', section: 'OVERALL' },
  { text: '한줄요약', section: 'OVERALL' },
  { text: '요약', section: 'OVERALL' },
  { text: '정리', section: 'OVERALL' },
  { text: '느낀점', section: 'OVERALL' },
  { text: '느낌점', section: 'OVERALL' },
  { text: '느낌', section: 'OVERALL' },
  { text: 'Conclusion', section: 'OVERALL' },
  { text: 'Comment', section: 'OVERALL' },
  // 네이버 카페 시음기가 `평.` 한 글자로 총평을 여는 경우가 있다.
  // glued 를 켜지 않으므로 `평소에`·`평가가` 는 걸리지 않는다(`평점` 은 더 긴 라벨이라 먼저 잡힌다).
  { text: '평', section: 'OVERALL' },
  { text: 'Overall', section: 'OVERALL' },
  { text: 'Verdict', section: 'OVERALL' },
  { text: 'SUMMARY', section: 'OVERALL' },
  { text: 'Total', section: 'OVERALL' },
  { text: '후기', section: 'OVERALL' },
  // 점수
  { text: '평점', section: 'SCORE' },
  { text: '총점', section: 'SCORE' },
  { text: '점수', section: 'SCORE' },
  { text: 'Score', section: 'SCORE' },
  { text: 'Rating', section: 'SCORE' },
  // 스펙·기타 — 라벨과 형태가 같아서(`도수 - 46%`, `Type:`, `Cask No.`) 명시적으로 버려야 한다.
  ...(([
    '주종', '증류소', '증류', '병입자', '병입', '숙성년수', '숙성연수', '숙성 년수', '숙성', '년수',
    '지역', '기타', '바틀 컨디션', '바틀컨디션', '컨디션', 'Spec',
    '제품명', '제품', '구입처', '구매처', '판매처', '생산국',
    '도수', 'ABV', '용량', '가격', '캐스크', '병 상태', '병상태', '상태', '스펙',
    '출시 수량', '출시수량', '원산지', '원재료', '테이스팅 잔', '테이스팅잔',
    '외관', '색상', '색', '레그', '여담', '참고', '바틀', '보틀', '샘플 번호', '샘플번호',
    '종류', '빈티지', '시음순서', '시음 순서', '이름',
    // 정형 템플릿을 쓰는 사람들의 머리말 — 값만 적어 두는 칸이라 노트가 아니다.
    '위베번호', '시음일자', '시음 일자', '테이스팅 날짜', '날짜', '보틀잔량', '잔', '특이사항',
    '원료', '증류기', '원액', '싱글 캐스크', '싱글캐스크', '냉각 여과', '냉각여과',
    '색소 첨가', '색소첨가',
    'Type', 'Region', 'Remarks', 'Appearance', 'Colour', 'Color',
    'Cask No', 'Cask', 'AGE', 'Aged', 'Date', 'Distillery', 'Distilled', 'Bottled', 'Bottler', 'Batch',
    // 색상 칸을 한 글자로 적는 사람이 있다 — `C.` `A :`
    'C', 'A',
    // 남이 매긴 점수 — 위스키베이스 평점을 내 점수로 읽으면 안 된다.
    '위베', '위스키베이스', 'Whiskybase', 'WB',
  ] as const).map((text) => ({ text, section: 'IGNORE' as Section }))),
]

/** 긴 라벨이 먼저 걸려야 `총평가`가 `총평`으로 잘리지 않는다. */
const SORTED_LABELS = [...LABELS].sort((a, b) => b.text.length - a.text.length)

/** `결론` 계열은 구간별 소감(`총평.`)이 여러 번 나오는 글에서 진짜 총평을 가려낸다. */
const CONCLUSION_LABELS = new Set(['결론', 'Verdict'])

/**
 * 라벨 앞에 붙는 장식.
 *
 * 사람마다 취향이 제각각이라 넓게 잡는다 — 불릿(`■ ▶ •`), 괄호(`[ ( 【 《 <`),
 * 표 구분자(`|`), 번호(`1.` `2)`), 이모지(`🥃 향:`)까지 실제로 쓰인다.
 */
const DECORATION = '(?:[\\s\\[\\(【《<※▶▷■◆●▪◦•‣⦁・·*→>|#]|\\d{1,2}[.)]|\\p{Extended_Pictographic}|\\uFE0F)'
/**
 * 라벨과 본문을 가르는 문자.
 *
 * `<향>` `노즈)` `피니쉬? :` `향~` `향 = ` 처럼 닫는 기호·물음표·물결·등호로
 * 넘어가는 글이 실제로 있어 여는 기호만큼이나 넓게 잡는다.
 * 한글 자모(`향ㅋㅋ`)도 여기 넣는다 — 자모 나열로 시작하는 낱말은 없다.
 */
const SEPARATOR = '[:：\\-–—.)\\]>》】?!*~=|\\u3131-\\u318E]'
/** 라벨 뒤 첫 글자가 여기 속하면 라벨로 인정한다(공백·구분자·여는 괄호). */
const BOUNDARY = new RegExp(`^[\\s(（]|^${SEPARATOR}`, 'u')
/** 라벨과 본문 사이의 구분자 묶음 — `? : `, `: -. `, `ㅋㅋ ` 처럼 여러 개가 겹친다. */
const SEPARATOR_RUN = new RegExp(`^(?:\\s*${SEPARATOR}){0,6}\\s*`, 'u')
/** 라벨을 감싼 장식이 뒤에도 붙는 경우 — `■ 향 ■`, `| 향 |` */
const TRAILING_DECORATION = /[\s*|■◆●▪▶◀◇□★☆~=-]+$/

// ── 전처리 ───────────────────────────────────────────────────────

/** 통째로 버리는 줄 — 커뮤니티 서명·앱 꼬리말·해시태그 덩어리. */
const NOISE_LINE = [
  /^-\s*dc\s*(official\s*)?app$/i,
  /^(시작에\s*앞서|리뷰에\s*앞서).*(감사|고맙)/,
  /^@\S+(\s|$).*(감사|고맙|잘\s*마)/,
  // 점 하나만 찍어 문단을 띄우는 습관 — 본문이 아니다.
  /^[.·]{1,3}$/,
  // 나눔 인사는 글머리에도 맺음말에도 붙는다 — `눔나`(나눔의 은어)까지 함께 본다.
  /^.{0,40}(나눔|눔나).{0,25}(감사|고맙)/,
  /^이\s*글은.*작성되었습니다/,
  /^(#\S+\s*)+$/,
  /^@\S+$/,
  /^(더\s*보기|\.\.\.\s*more|…\s*more)$/i,
  /^(스크랩|추천|공유|신고|목록|댓글|본문\s*보기)$/,
  // 구분선만 있는 줄 — `-----`, `=====`, `*****`, `~~~~~`
  /^[-=_*~·・]{3,}$/,
]

/**
 * 맨 앞 제목 접두 — `위위리)`, `눔나리뷰)`, `[리뷰]` 같은 갤러리 관용 표기.
 *
 * 닫는 기호를 <b>반드시</b> 요구한다. 옛 규칙은 그걸 선택으로 둬서
 * `나눔해주신 Hasi님께 감사드립니다.` 의 `나눔` 두 글자를 잘라 먹었고,
 * 그 바람에 나눔 인사 줄이 잡음 필터에도 안 걸려 총평에 남았다.
 */
const TITLE_PREFIX =
  /^\s*\[?\s*(위위리|위나리|위비리|위바리|위린이|눔나\s*리뷰|눔나리뷰|나눔\s*리뷰|나눔리뷰|나눔|리뷰)\s*[)\]:]\s*/

function preprocess(raw: string): string {
  const text = (raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ ​﻿]/g, ' ')
    .replace(TITLE_PREFIX, '')

  const lines = text.split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .filter((line) => !NOISE_LINE.some((pattern) => pattern.test(line.trim())))

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ── 라벨 탐지 ────────────────────────────────────────────────────

interface Hit {
  section: Section
  label: string
  index: number
  /** 라벨 바로 뒤 괄호 안 점수 — `N (85)` 형태 */
  parenScore: number | null
  /** 라벨과 같은 줄에 이어진 본문 */
  rest: string
}

/**
 * 한 줄이 라벨로 시작하는지 본다.
 *
 * 라벨 뒤에 한글·영문이 곧바로 붙는 경우는 `glued` 라벨에만 허용한다 —
 * 안 그러면 `PX쉐리`가 팔레트가 되고 `향긋한 보태니컬`이 향 라벨이 된다.
 */
function matchLabel(line: string): Omit<Hit, 'index'> | null {
  const opener = line.match(/^\s*([[(【《])/)?.[1]
  const stripped = line.replace(new RegExp(`^(?:${DECORATION}|-{1,3})+`, 'u'), '')
  if (!stripped) return null

  for (const def of SORTED_LABELS) {
    if (stripped.length < def.text.length) continue
    if (stripped.slice(0, def.text.length).toLowerCase() !== def.text.toLowerCase()) continue

    let after = stripped.slice(def.text.length)

    // 라벨 직후 괄호 점수 — `N (85)`, `N (85점)`, `P (4.5/5)`
    let parenScore: number | null = null
    const paren = after.match(/^\s*\(\s*(\d{1,3}(?:\.\d{1,2})?)\s*(?:\/\s*(\d{1,3}))?\s*(?:점|p|pt|pts)?\s*\)/i)
    if (paren) {
      parenScore = normalizeScore(Number(paren[1]), paren[2] ? Number(paren[2]) : null)
      after = after.slice(paren[0].length)
    }

    // 라벨 뒤 별점 — `향 ★★★★☆`
    if (parenScore == null && PHASE_SECTIONS.has(def.section)) {
      const stars = after.match(/^\s*([★☆]{3,7})/)
      if (stars) {
        parenScore = clampScore((stars[1].match(/★/g) ?? []).length * 20)
        if (parenScore != null) after = after.slice(stars[0].length)
      }
    }

    // 두 이름을 나란히 적는 표기 — `향(Nose)`, `Nose(향)`, `향/Nose`, `피니시 / Finish`
    after = after
      .replace(/^\s*\(\s*[A-Za-z가-힣][A-Za-z0-9가-힣\s/]{0,18}\)/, '')
      .replace(/^\s*\/\s*[A-Za-z가-힣]{1,12}/, '')

    const boundary = after[0]
    if (boundary !== undefined && !BOUNDARY.test(boundary) && !def.glued) continue

    // 구분자·공백을 걷어 내고 남은 것이 같은 줄에 딸린 본문이다.
    const consumed = after.match(SEPARATOR_RUN)?.[0] ?? ''
    /** 공백 말고 진짜 구분자(`:`·`-`·`)`)가 있었는가 — 스펙 줄 판정에 쓴다. */
    const hasExplicitSeparator = /\S/.test(consumed)
    let rest = after.slice(consumed.length).trim()
    // `[ 향 : 레드베리, … 후추]` 처럼 라벨과 본문을 통째로 괄호에 넣는 글이 있다.
    // 여는 기호를 장식으로 걷어 냈으면 짝이 되는 닫는 기호도 본문에서 뺀다.
    if (opener) rest = rest.replace(new RegExp(`\\s*${CLOSERS[opener]}$`), '').trim()
    // `■ 향 ■`, `| 향 |`, `*향*` 처럼 라벨을 양쪽에서 감싼 장식은 뒤에도 걷어 낸다.
    rest = rest.replace(TRAILING_DECORATION, '').trim()

    // 스펙 라벨은 값을 적어 두는 칸에만 쓴다.
    //
    // `가격`·`색`·`상태` 같은 말은 본문 첫머리에도 흔히 온다. 구분자 없이 공백만으로
    // 이어질 때는 <b>뒤에 값이 오는지</b>로 가른다 — `ABV 55.4%`·`Distillery Suzaki` 는
    // 스펙이지만 `가격 생각하면 훌륭하다` 는 총평 본문이다. 이걸 안 가리면 문장이 통째로 사라진다.
    if (def.section === 'IGNORE' && !hasExplicitSeparator
      && rest !== '' && !/^[\d(（A-Za-z]/.test(rest)) continue

    // 괄호 없이 라벨 바로 뒤에 점수를 적는 템플릿 — `NOSE 86.00 포도, 메탈릭…`, `N 88 버터…`
    // 두세 자리 수에 공백이 따라올 때만 본다. `향: 3가지 과일`·`F: 12년 숙성` 은 걸리지 않는다.
    if (parenScore == null && PHASE_SECTIONS.has(def.section)) {
      // 뒤에 노트가 이어지든(`N 88 버터…`) 점수만 적고 줄을 바꾸든(`N: 87`) 둘 다 받는다.
      const bare = rest.match(/^(\d{2,3}(?:\.\d{1,3})?)\s*점?(?:\s+(?=\S)|$)/)
      if (bare) {
        const value = normalizeScore(Number(bare[1]), null)
        if (value != null) {
          parenScore = value
          rest = rest.slice(bare[0].length).trim()
        }
      }
    }
    return { section: def.section, label: def.text, parenScore, rest }
  }
  return null
}

const CLOSERS: Record<string, string> = { '[': '\\]', '(': '\\)', '【': '】', '《': '》' }

const WEAK_LABELS = new Set(LABELS.filter((def) => def.weak).map((def) => def.text))

function collectHits(lines: string[]): Hit[] {
  const hits: Hit[] = []
  lines.forEach((line, index) => {
    const matched = matchLabel(line.trim())
    if (matched) hits.push({ ...matched, index })
  })

  // weak 라벨(`노트`)은 그 구간이 아직 비어 있을 때만 살린다.
  const strongSections = new Set(
    hits.filter((hit) => !WEAK_LABELS.has(hit.label)).map((hit) => hit.section),
  )
  return hits.filter((hit) => !WEAK_LABELS.has(hit.label) || !strongSections.has(hit.section))
}

// ── 점수 ─────────────────────────────────────────────────────────

/** 점수로 읽으면 안 되는 숫자 — 도수·용량·가격·연도·비율. */
const NOT_A_SCORE = /(%|도수|ml|cl|리터|년|년산|yo|y\.o|원|₩|\$|:|,\d{3})/i

function clampScore(value: number): number | null {
  if (!Number.isFinite(value) || value < 0 || value > 100) return null
  return Math.round(value * 10) / 10
}

function normalizeScore(value: number, denominator: number | null): number | null {
  if (!Number.isFinite(value) || value < 0) return null
  if (denominator === 100) return clampScore(value)
  if (denominator === 10) return clampScore(value * 10)
  if (denominator === 5) return clampScore(value * 20)
  if (denominator != null) return null
  // 분모가 없으면 값 범위로 추정한다. 추정했다는 사실은 호출부가 경고로 알린다.
  if (value > 10) return clampScore(value)
  if (value <= 5) return clampScore(value * 20)
  return clampScore(value * 10)
}

interface ScoreHit { value: number; inferredScale: boolean }

/** `88/100`, `4.5/5`, `★★★★☆`, `88점` 처럼 명시적으로 적힌 점수를 찾는다. */
function findExplicitScore(text: string): ScoreHit | null {
  const stars = text.match(/[★☆]{3,}/)
  if (stars) {
    const filled = (stars[0].match(/★/g) ?? []).length
    const value = clampScore(filled * 20)
    if (value != null) return { value, inferredScale: false }
  }

  const fraction = text.match(/(\d{1,3}(?:\.\d{1,2})?)\s*\/\s*(100|10|5)\b/)
  if (fraction) {
    const value = normalizeScore(Number(fraction[1]), Number(fraction[2]))
    if (value != null) return { value, inferredScale: false }
  }

  const pointed = text.match(/(\d{1,3}(?:\.\d{1,2})?)\s*점/)
  if (pointed) {
    const value = normalizeScore(Number(pointed[1]), null)
    if (value != null) return { value, inferredScale: Number(pointed[1]) <= 10 }
  }

  const bare = text.match(/(?:^|[\s=])(\d{1,3}(?:\.\d{1,2})?)(?:\s*$|[\s.,])/)
  if (bare && !NOT_A_SCORE.test(text)) {
    const raw = Number(bare[1])
    const value = normalizeScore(raw, null)
    if (value != null) return { value, inferredScale: raw <= 10 }
  }
  return null
}

/**
 * 구간 본문 끝에 홀로 남은 숫자를 그 구간의 점수로 회수한다.
 *
 * `… 약간의 달콤한 베이스의 매움이 추가된 향 90` 처럼 점수를 구간 끝에 적는 사람이 있다
 * (디시 1771945). 연도(`1996`)를 주워 담지 않도록 100 이하만 받는다.
 */
function findTrailingScore(text: string): { value: number; stripped: string } | null {
  const matched = text.match(/(?:^|[\s,.])(\d{1,3}(?:\.\d{1,2})?)\s*$/)
  if (!matched) return null
  const raw = Number(matched[1])
  if (raw > 100) return null
  const value = normalizeScore(raw, null)
  if (value == null) return null
  return { value, stripped: text.slice(0, text.length - matched[0].length).trim() }
}

// ── 비교 리뷰 판정 ───────────────────────────────────────────────

/** 글 전체 어디에 나와도 비교 리뷰로 보는 표현. */
const VERSUS_STRONG = /(^|[\s(\[])vs\.?([\s)\]]|$)|비교\s*시음|비교\s*리뷰|비교\s*해\s*봤/i
/**
 * 글머리에 있을 때만 비교 리뷰로 보는 표현.
 *
 * `버티컬` 은 지난 시음을 회고하며 쓰기도 한다 — 나가하마 #3.1 리뷰는 한 병짜리인데
 * 총평에서 "자매 캐스크와 버티컬 했을 때"라고 적는다. 전역으로 잡으면 멀쩡한 글이 막힌다.
 */
const VERSUS_LEAD = /버티컬|vertical/i
const LEAD_SCAN_CHARS = 150
/** 이 길이 이하의 도입부만 총평 앞에 둔다. 그보다 길면 총평을 먼저 보여 준다. */
const LEAD_PREAMBLE_MAX = 150

/** 한 구간 안에서 `이름:` 형태로 갈라 쓰는 비교 글 (`Beacon:` / `Gold Foil 16:`). */
function hasRepeatedSubLabels(sections: Map<Section, string>): boolean {
  const sets: string[][] = []
  for (const phase of ['NOSE', 'PALATE', 'FINISH'] as const) {
    const body = sections.get(phase)
    if (!body) continue
    const names = [...body.matchAll(/(?:^|\n)\s*([^\n:：]{2,30}?)\s*[:：]\s/g)]
      .map((match) => match[1].trim().toLowerCase())
    const unique = [...new Set(names)]
    if (unique.length >= 2) sets.push(unique)
  }
  if (sets.length < 2) return false
  // 같은 이름 묶음이 두 구간 이상에서 반복되면 술 여러 개를 나란히 적은 글이다.
  return sets[0].some((name) => sets[1].includes(name))
}

function numberedItemCount(text: string): number {
  return [...text.matchAll(/(?:^|\n)\s*\d{1,2}\.\s+(\S.{7,})/g)].length
}

// ── 구간 나누기 ──────────────────────────────────────────────────

interface Blocks {
  sections: Map<Section, string>
  /** 첫 라벨 앞 도입부 — 스펙 줄을 걷어 낸 나머지 */
  preamble: string
  /** 총평으로 채택한 본문 */
  conclusion: string | null
  overallCount: number
}

function sliceBlocks(lines: string[], hits: Hit[]): Blocks {
  const sections = new Map<Section, string>()
  const overalls: { text: string; previousPhase: Section | null; isConclusion: boolean }[] = []

  const firstIndex = hits.length > 0 ? hits[0].index : lines.length
  const preambleLines = lines.slice(0, firstIndex)

  let previousPhase: Section | null = null
  hits.forEach((hit, order) => {
    const end = order + 1 < hits.length ? hits[order + 1].index : lines.length
    const chunk = [hit.rest, ...lines.slice(hit.index + 1, end)]
      .join('\n').replace(/\n{3,}/g, '\n\n').trim()

    if (hit.section === 'IGNORE') return
    if (hit.section === 'OVERALL') {
      overalls.push({ text: chunk, previousPhase, isConclusion: CONCLUSION_LABELS.has(hit.label) })
      return
    }
    if (hit.section === 'SCORE') {
      sections.set('SCORE', [sections.get('SCORE'), chunk].filter(Boolean).join('\n'))
      return
    }
    // 같은 구간이 두 번 잡히는 글은 이미 comparison 으로 걸러졌다.
    sections.set(hit.section, chunk)
    previousPhase = hit.section
  })

  // 진짜 총평 고르기: `결론` 계열 > 마지막 `총평`.
  // 아카라이브 닛카·블라인드 리뷰는 구간마다 `총평.` 을 쓰고 맨 끝에 `결론.` 을 쓴다 —
  // 순서대로 첫 `총평` 을 집으면 향 소감이 총평 칸에 들어간다.
  let conclusion: string | null = null
  if (overalls.length > 0) {
    const conclusions = overalls.filter((item) => item.isConclusion)
    const chosen = conclusions.length > 0
      ? conclusions[conclusions.length - 1]
      : overalls[overalls.length - 1]
    conclusion = chosen.text

    // 채택하지 않은 총평(= 구간별 소감)은 앞선 구간 노트 뒤에 붙여 글자를 잃지 않는다.
    for (const item of overalls) {
      if (item === chosen || !item.previousPhase || !item.text) continue
      const current = sections.get(item.previousPhase) ?? ''
      sections.set(item.previousPhase, [current, item.text].filter(Boolean).join('\n'))
    }
  }

  const preamble = preambleLines
    .filter((line) => matchLabel(line.trim())?.section !== 'IGNORE')
    .join('\n').replace(/\n{3,}/g, '\n\n').trim()

  return { sections, preamble, conclusion, overallCount: overalls.length }
}

/**
 * 총평 라벨이 아예 없는 글에서 마지막 구간 뒤에 붙은 마무리 문단을 떼어 낸다.
 *
 * 디시 1771857 은 `F:` 다음에 라벨 없이 `87/100. 요거 25 언더? 살만하다…` 로 총평을 쓴다.
 * 그대로 두면 총평이 피니시 노트에 섞인다. 점수 표기가 있는 줄을 경계로 삼고,
 * 없으면 빈 줄로 갈린 마지막 문단을 쓴다.
 */
function splitTrailingOverall(finishText: string): { finish: string; overall: string } | null {
  const lines = finishText.split('\n')
  // 점수 표기로 총평을 여는 글 — `87/100. 요거 25 언더? 살만하다…`
  // 다만 `위배식 88점` 처럼 점수만 달랑 적어 끝내는 줄도 있어, 뒤에 할 말이 남아 있을 때만 경계로 쓴다.
  const scoreLine = lines.findIndex((line, index) =>
    index > 0
    && line.trim().length > 15
    && /(\d{1,3}(?:\.\d{1,2})?\s*\/\s*(?:100|10|5)\b|\d{1,3}\s*점)/.test(line))
  if (scoreLine > 0) {
    return {
      finish: lines.slice(0, scoreLine).join('\n').trim(),
      overall: lines.slice(scoreLine).join('\n').trim(),
    }
  }

  // 그 밖에는 빈 줄로 갈린 첫 문단만 피니시 노트고 <b>그 뒤 전부</b>가 총평이다.
  // 마지막 문단만 떼면 총평이 네댓 문단인 글에서 피니시 노트가 총평으로 가득 찬다.
  const paragraphs = finishText.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  if (paragraphs.length < 2) return null

  // 다만 첫 문단이 `흑설탕, 오렌지, 오크, 탄닌` 같은 <b>아로마 나열</b>이면
  // 그 다음 문단까지가 피니시 설명이다. 나열만 노트에 남기면 정작 설명이 총평으로 샌다.
  const keep = isNoteList(paragraphs[0]) ? 2 : 1
  if (paragraphs.length <= keep) return null
  return {
    finish: paragraphs.slice(0, keep).join('\n\n'),
    overall: paragraphs.slice(keep).join('\n\n'),
  }
}

/**
 * 서술 문장이 아니라 쉼표로 이어 붙인 아로마 목록인가.
 *
 * 문장 끝 어미로 가리려 했더니 `스파이스, 달달함, 씁쓸함` 처럼 `함`으로 끝나는 노트가 걸렸다.
 * 대신 <b>토막이 짧은지</b>로 본다 — 목록은 항목 하나가 길지 않고, 쉼표가 든 서술문은 길다.
 */
function isNoteList(paragraph: string): boolean {
  const line = paragraph.trim()
  if (line.includes('\n') || line.length > 100) return false
  const parts = line.split(',').map((part) => part.trim()).filter(Boolean)
  return parts.length >= 2 && parts.every((part) => part.length <= 15)
}

// ── 본체 ─────────────────────────────────────────────────────────

export function parseReviewText(raw: string, ctx: ParseContext = {}): ReviewImportPlan {
  const warnings: ImportWarning[] = []
  const empty = (outcome: ImportOutcome, reason: string): ReviewImportPlan => ({
    outcome,
    reason,
    noseNote: '', tasteNote: '', finishNote: '', comment: '',
    noseScore: null, tasteScore: null, finishScore: null,
    applied: [], warnings: [],
  })

  const body = preprocess(raw)
  if (!body) return empty('unlabeled', 'empty')

  const scanText = [ctx.title ?? '', body].join('\n')

  // 앱에서 복사하면 줄바꿈이 통째로 사라지는 경우가 있다. 그럴 때만 문장 중간의
  // 라벨 앞에 줄을 넣어 같은 알고리즘을 태우고, 추정했다는 사실을 경고로 남긴다.
  const lineCount = body.split('\n').filter((line) => line.trim()).length
  const working = lineCount <= 2 ? splitInlineLabels(body) : body
  const inlineFallback = working !== body

  const lines = working.split('\n')
  const hits = collectHits(lines)

  // ── 비교·다건 판정: 폼을 건드리지 않고 안내만 한다 ──
  const lead = [ctx.title ?? '', body.slice(0, LEAD_SCAN_CHARS)].join('\n')
  if (VERSUS_STRONG.test(scanText) || VERSUS_LEAD.test(lead)) return empty('comparison', 'versus')

  const countOf = (section: Section) => hits.filter((hit) => hit.section === section).length
  // 두 병을 나란히 적으면 향·맛·피니시가 <b>다 같이</b> 되풀이된다.
  // 한 구간만 두 번이면 오타일 때가 많아서(`F` 를 `P` 로 잘못 쓴 글이 실제로 있다)
  // 비교로 몰지 않고 아래의 라벨 부족 판정으로 넘긴다 — 안내 문구가 달라진다.
  const repeated = ['NOSE', 'PALATE', 'FINISH'].filter((s) => countOf(s as Section) > 1)
  if (repeated.length >= 2) return empty('comparison', 'labelRepeated')

  const foundPhases = PHASE_ORDER.filter((section) => countOf(section) > 0)
  if (foundPhases.length === 0 && numberedItemCount(body) >= 2) {
    return empty('comparison', 'numberedList')
  }

  const blocks = sliceBlocks(lines, hits)
  if (hasRepeatedSubLabels(blocks.sections)) return empty('comparison', 'subLabels')

  // ── 하나도 못 찾으면 손댈 것이 없다 ──
  // 하나라도 찾았으면 <b>찾은 것만</b> 채우고 나머지 칸은 비워 둔 채 알린다.
  // 전부 거절하면 세 칸을 다 다시 쓰게 되는데, 두 칸이라도 채워 주는 편이 낫다.
  if (foundPhases.length === 0) return empty('unlabeled', 'missingLabels')
  for (const section of PHASE_ORDER) {
    const count = countOf(section)
    if (count === 0) warnings.push({ field: PHASE_FIELD[section], code: 'notFound' })
    // 한 구간만 두 번인 글은 오타일 때가 많다(F 를 P 로 적음). 마지막 것만 남는다고 알린다.
    else if (count > 1) warnings.push({ field: PHASE_FIELD[section], code: 'duplicated' })
  }

  if (inlineFallback) warnings.push({ field: 'general', code: 'inlineFallback' })

  // 총평 라벨이 없으면 <b>문서상 마지막 구간</b> 뒤의 마무리 문단을 총평으로 뗀다.
  // 피니시가 없는 글도 있으므로 FINISH 로 못 박지 않는다.
  const lastPhase = [...hits].reverse().find((hit) => PHASE_SECTIONS.has(hit.section))?.section
  if (!blocks.conclusion && lastPhase) {
    const split = splitTrailingOverall(blocks.sections.get(lastPhase) ?? '')
    if (split) {
      blocks.sections.set(lastPhase, split.finish)
      blocks.conclusion = split.overall
      warnings.push({ field: 'comment', code: 'overallInferred' })
    }
  }

  const applied: ImportField[] = []
  const noseRaw = blocks.sections.get('NOSE') ?? ''
  const tasteRaw = blocks.sections.get('PALATE') ?? ''
  const finishRaw = blocks.sections.get('FINISH') ?? ''

  // 구간 끝에 홀로 붙은 숫자는 노트에서 떼어 내 점수 후보로 쓴다.
  const tails = [findTrailingScore(noseRaw), findTrailingScore(tasteRaw), findTrailingScore(finishRaw)]

  const noseNote = finalizeNote(tails[0]?.stripped ?? noseRaw, 'nose', warnings, applied)
  const tasteNote = finalizeNote(tails[1]?.stripped ?? tasteRaw, 'taste', warnings, applied)
  const finishNote = finalizeNote(tails[2]?.stripped ?? finishRaw, 'finish', warnings, applied)

  const comment = buildComment(blocks, warnings, applied)
  const scores = resolveScores(hits, blocks, tails.map((tail) => tail?.value ?? null), warnings)
  if (scores.nose != null) applied.push('score')

  if (ctx.spiritName && !mentionsSpirit(scanText, ctx.spiritName)) {
    warnings.push({ field: 'general', code: 'spiritMismatch', params: { name: ctx.spiritName } })
  }

  return {
    outcome: 'ok',
    noseNote, tasteNote, finishNote, comment,
    noseScore: scores.nose, tasteScore: scores.taste, finishScore: scores.finish,
    applied, warnings,
  }
}

// ── 조립 헬퍼 ────────────────────────────────────────────────────

function buildComment(blocks: Blocks, warnings: ImportWarning[], applied: ImportField[]): string {
  const conclusion = blocks.conclusion ?? ''
  const preamble = blocks.preamble

  if (preamble) warnings.push({ field: 'comment', code: 'leftoverMerged' })
  if (conclusion) {
    if (blocks.overallCount > 1) warnings.push({ field: 'comment', code: 'overallRepeated' })
  } else {
    warnings.push({ field: 'comment', code: 'overallMissing' })
  }

  // 어느 구간에도 안 들어간 도입부는 버리지 않고 총평과 함께 담는다.
  //
  // 순서는 도입부 길이가 정한다. 네이버 카페 시음기는 구매 경위·가격·병 이야기로
  // 서너 문단을 쓰고 시작하는 일이 잦은데, 그걸 앞에 두면 정작 총평이 저 아래로 밀린다.
  // 짧은 한두 줄짜리 도입부만 앞에 두고, 길면 총평을 먼저 보여 준다.
  // 합쳐서 상한을 넘을 때도 마찬가지다 — 잘려 나가야 할 것은 도입부지 총평이 아니다.
  const fits = preamble.length + conclusion.length + 2 <= REVIEW_TEXT_MAX_LENGTH
  const preambleLeads = fits && (!conclusion || preamble.length <= LEAD_PREAMBLE_MAX)
  const pieces = preambleLeads ? [preamble, conclusion] : [conclusion, preamble]

  let comment = pieces.filter(Boolean).join('\n\n').trim()
  if (comment.length > REVIEW_TEXT_MAX_LENGTH) {
    comment = comment.slice(0, REVIEW_TEXT_MAX_LENGTH)
    warnings.push({ field: 'comment', code: 'truncated', params: { max: REVIEW_TEXT_MAX_LENGTH } })
  }
  if (comment) applied.push('comment')
  return comment
}

function finalizeNote(
  raw: string, field: ImportField, warnings: ImportWarning[], applied: ImportField[],
): string {
  let note = raw.replace(/\n{3,}/g, '\n\n').trim()
  if (note.length > REVIEW_TEXT_MAX_LENGTH) {
    note = note.slice(0, REVIEW_TEXT_MAX_LENGTH)
    warnings.push({ field, code: 'truncated', params: { max: REVIEW_TEXT_MAX_LENGTH } })
  }
  // 20자 미만은 저장 단계에서 막히는 값이다 — 채우기 전에 알린다.
  if (note.length > 0 && note.length < REVIEW_NOTE_MIN_LENGTH) {
    warnings.push({ field, code: 'tooShort', params: { min: REVIEW_NOTE_MIN_LENGTH } })
  }
  if (note) applied.push(field)
  return note
}

interface ResolvedScores { nose: number | null; taste: number | null; finish: number | null }

/**
 * 점수는 <b>셋 다 있거나 셋 다 없거나</b>다 — 서버가 REVIEW_013 으로 부분 입력을 막는다.
 * 총점 하나만 찾았다고 셋으로 나눠 넣지 않는다. 없는 데이터를 만드는 일이다.
 */
function resolveScores(
  hits: Hit[], blocks: Blocks, tails: (number | null)[], warnings: ImportWarning[],
): ResolvedScores {
  const none: ResolvedScores = { nose: null, taste: null, finish: null }
  const paren = (section: Section) => hits.find((hit) => hit.section === section)?.parenScore ?? null

  const picked = ([['NOSE', 0], ['PALATE', 1], ['FINISH', 2]] as [Section, number][])
    .map(([section, order]) => paren(section) ?? tails[order])

  if (picked.every((value) => value != null)) {
    return { nose: picked[0]!, taste: picked[1]!, finish: picked[2]! }
  }

  const scoreText = [blocks.sections.get('SCORE'), blocks.conclusion].filter(Boolean).join('\n')

  // 세 점수를 `89/88/88` 한 줄로 몰아 적는 사람이 있다. 총점 표기(`88/100`)와 달리
  // 세 토막이라 헷갈릴 여지가 없다.
  const triple = scoreText.match(/(?:^|\s)(\d{2,3})\s*\/\s*(\d{2,3})\s*\/\s*(\d{2,3})(?:\s|$)/)
  if (triple) {
    const values = [triple[1], triple[2], triple[3]].map((value) => clampScore(Number(value)))
    if (values.every((value) => value != null)) {
      return { nose: values[0]!, taste: values[1]!, finish: values[2]! }
    }
  }

  // 그래도 안 모이면 총점만 있는지 본다 — 있어도 채우지 않고 알리기만 한다.
  const overall = scoreText ? findExplicitScore(scoreText) : null
  if (overall) {
    warnings.push({ field: 'score', code: 'overallOnly', params: { value: overall.value } })
  } else if (picked.some((value) => value != null)) {
    warnings.push({ field: 'score', code: 'partial' })
  }
  return none
}

/** 본문에 대상 주류 이름의 조각이 하나라도 있는지 — 없으면 알리기만 한다(차단하지 않음). */
function mentionsSpirit(text: string, spiritName: string): boolean {
  const haystack = text.toLowerCase().replace(/\s/g, '')
  const tokens = spiritName.toLowerCase().split(/[\s/·,()]+/).filter((token) => token.length >= 2)
  if (tokens.length === 0) return true
  return tokens.some((token) => haystack.includes(token))
}

/**
 * 줄바꿈이 없는 한 덩어리에서 라벨 앞에 줄바꿈을 넣는다.
 * 위치를 추정한 것이므로 호출부가 반드시 경고를 남긴다.
 */
function splitInlineLabels(text: string): string {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const multi = SORTED_LABELS
    .filter((def) => def.section !== 'IGNORE' && def.text.length >= 2)
    .map((def) => escape(def.text))
    .join('|')

  return text
    .replace(new RegExp(`(?!^)(${DECORATION}*(?:${multi})\\s*${SEPARATOR})`, 'g'), '\n$1')
    // 한 글자 라벨은 구분자가 반드시 뒤따를 때만 끊는다 — `PX쉐리` 를 자르지 않기 위해서다.
    .replace(/([가-힣a-z0-9])\s*([NPF]\s*[:：])/g, '$1\n$2')
}
