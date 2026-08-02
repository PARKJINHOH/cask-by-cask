/**
 * 주류 정보 조사 프롬프트(docs/*-research-prompt.md)와 코드의 정합성 검증.
 *
 * <p>이 문서들은 관리자 주류 등록 폼의 **사본**이다 — 허용 값(enum)·길이 제한을 그대로 옮겨 적어 뒀다.
 * 코드만 바꾸고 문서를 두면 AI 가 **저장되지 않는 값**을 만들어 오고, 그걸 사람이 눈으로 걸러야 한다.
 * AGENTS.md 의 "주류 정보 조사 프롬프트" 절에 같은 규칙을 적어 뒀지만 사람이 지키는 약속이라
 * 여기서 기계적으로 막는다.
 *
 * 두 방향을 모두 본다.
 *   - **누락**: 코드에 있는 값이 문서에 없다 → 새 enum 값을 추가하고 문서를 안 고친 경우
 *   - **유령**: 문서에 있는 값이 코드에 없다 → enum 을 지우거나 이름을 바꾸고 문서를 안 고친 경우
 *
 * 산지 코드처럼 문서가 **의도적으로 일부만** 싣는 목록은 '유령' 방향만 본다.
 *
 * 실행: npm run test:research-prompts
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')
const DOCS = join(REPO, 'docs')
const ENUM_DIR = join(REPO, 'caskbycask-api', 'src', 'main', 'java', 'com', 'caskbycask',
  'domain', 'spirit', 'entity', 'enums')
const ADMIN_COMPONENTS = join(HERE, '..', 'src', 'domain', 'admin', 'components')
const MIGRATION_DIR = join(REPO, 'caskbycask-api', 'src', 'main', 'resources', 'db', 'migration')

// 캐스크·수확·발효 목록의 단일 소스는 data/*.ts 다 (컴포넌트가 아니라)
const { BROAD_CASK_CATEGORIES } = await import('@/domain/spirit/data/whisky')
const { HARVEST_METHODS, FERMENTATION_VESSELS } = await import('@/domain/spirit/data/wine')

const doc = (name) => readFileSync(join(DOCS, `${name}-research-prompt.md`), 'utf8')

const COGNAC = doc('cognac')
const WHISKY = doc('whisky')
const WINE = doc('wine')

/** Java enum 의 값 이름을 선언 순서대로. 주석·javadoc 은 무시한다. */
function javaEnum(file) {
  const src = readFileSync(join(ENUM_DIR, file), 'utf8')
  const body = src.slice(src.indexOf('{') + 1, src.lastIndexOf('}'))
  const clean = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  return [...clean.matchAll(/^\s*([A-Z][A-Z_]*)\s*[,;]?\s*$/gm)].map((m) => m[1])
}

/** `WineRegion` 의 전체 코드 목록 */
function wineRegionCodes() {
  const src = readFileSync(join(ENUM_DIR, 'WineRegion.java'), 'utf8')
  return [...src.matchAll(/^\s+([A-Z][A-Z0-9_]+)\("[A-Z-]+"/gm)].map((m) => m[1])
}

/**
 * 문서에서 enum 처럼 생긴 토큰(대문자+언더스코어, 2글자 이상)을 뽑는다.
 * `AOC`·`JSON`·`XO` 같은 산문 약어가 섞이므로 호출부가 관심 있는 집합으로 교집합을 낸다.
 */
function upperTokens(text) {
  return new Set([...text.matchAll(/\b([A-Z][A-Z0-9_]{1,})\b/g)].map((m) => m[1]))
}

const REGION_CODES = wineRegionCodes()
const REGION_SET = new Set(REGION_CODES)
/** 실제 산지 코드에서 뽑은 국가 접두사 — 캐스크 `EX_BOURBON` 같은 동형 토큰과 구분하는 기준 */
const REGION_PREFIXES = new Set(REGION_CODES.map((c) => c.split('_')[0]))

/** 문서에 등장하는 산지 코드 후보 — 실제 국가 접두사로 시작하는 토큰만 본다 */
function mentionedRegionCodes(text) {
  // 끝이 언더스코어인 토큰은 `GB_SCT_*` 같은 산문 속 와일드카드 표기라 제외한다
  const tokens = [...text.matchAll(/\b([A-Z]{2}_[A-Z0-9_]*[A-Z0-9])\b/g)].map((m) => m[1])
  return [...new Set(tokens.filter((t) => REGION_PREFIXES.has(t.split('_')[0])))]
}

// ── 값 집합 검증 ─────────────────────────────────────────

describe('꼬냑 프롬프트', () => {
  const cases = [
    ['CognacGrade', 'CognacGrade.java'],
    ['CognacCru', 'CognacCru.java'],
    ['CognacOakType', 'CognacOakType.java'],
  ]
  for (const [name, file] of cases) {
    const values = javaEnum(file)
    test(`${name} 값이 모두 문서에 있다`, () => {
      for (const v of values) {
        assert.ok(COGNAC.includes(v), `${name}.${v} 가 프롬프트에 없다 — AI 가 이 값을 못 쓴다`)
      }
    })
  }

  test('문서의 등급·크뤼·오크 값이 전부 실제 enum 이다', () => {
    const known = new Set([
      ...javaEnum('CognacGrade.java'),
      ...javaEnum('CognacCru.java'),
      ...javaEnum('CognacOakType.java'),
    ])
    // 문서가 목록으로 싣는 값만 본다(산문 약어 제외) — 허용 값 블록 안의 토큰
    const listed = [...upperTokens(COGNAC)].filter((t) => /^(GRANDE|PETITE|BORDERIES|FINS|BONS|BOIS|LIMOUSIN|TRONCAIS|ALLIER|NEVERS|VOSGES|JUPILLES|BERTRANGES|FRENCH|HORS|NAPOLEON|VSOP|XXO|EXTRA)/.test(t))
    for (const t of listed) {
      if (t === 'BOIS' || t === 'FINS' || t === 'BONS' || t === 'GRANDE' || t === 'PETITE'
        || t === 'FRENCH' || t === 'HORS') continue // 라벨 안의 낱말 조각
      assert.ok(known.has(t), `프롬프트의 '${t}' 는 실제 enum 에 없다 — 이름이 바뀌었거나 삭제됐다`)
    }
  })

  test('꼬냑 산지 코드가 실제 WineRegion 코드다', () => {
    for (const code of mentionedRegionCodes(COGNAC)) {
      assert.ok(REGION_SET.has(code), `프롬프트의 산지 코드 '${code}' 가 WineRegion 에 없다`)
    }
  })

  test('법정 6개 크뤼 산지 코드가 모두 실려 있다', () => {
    for (const code of REGION_CODES.filter((c) => c.startsWith('FR_COGNAC'))) {
      assert.ok(COGNAC.includes(code), `${code} 가 프롬프트에 없다`)
    }
  })
})

describe('위스키 프롬프트', () => {
  test('WhiskyStyle 값이 모두 문서에 있다', () => {
    for (const v of javaEnum('WhiskyStyle.java')) {
      assert.ok(WHISKY.includes(v), `WhiskyStyle.${v} 가 프롬프트에 없다`)
    }
  })

  const caskCodes = BROAD_CASK_CATEGORIES.map((c) => c.code)

  test('캐스크 대분류가 모두 문서에 있다', () => {
    assert.ok(caskCodes.length >= 10, `캐스크 코드 파싱 실패 (${caskCodes.length}개)`)
    for (const code of caskCodes) {
      assert.ok(WHISKY.includes(code), `캐스크 '${code}' 가 프롬프트에 없다`)
    }
  })

  test('프롬프트의 캐스크 코드가 전부 실제 대분류다', () => {
    const known = new Set(caskCodes)
    const listed = [...upperTokens(WHISKY)].filter((t) => /^(EX_|NEW_OAK|MIZUNARA)/.test(t))
    for (const t of listed) {
      assert.ok(known.has(t), `프롬프트의 캐스크 '${t}' 는 실제 대분류에 없다`)
    }
  })

  test('에디션 유형이 폼과 일치한다', () => {
    const formSrc = readFileSync(join(ADMIN_COMPONENTS, 'SpiritFormFields.tsx'), 'utf8')
    const block = formSrc.slice(formSrc.indexOf("{/* 에디션 유형 */}"))
    const types = [...block.slice(0, 900).matchAll(/\['(NONE|BATCH|SINGLE_CASK|RELEASE_YEAR)',/g)]
      .map((m) => m[1])
    assert.ok(types.length === 4, `에디션 유형 파싱 실패: ${types.join(',')}`)
    for (const t of types.filter((x) => x !== 'NONE')) {
      assert.ok(WHISKY.includes(t), `에디션 유형 '${t}' 가 프롬프트에 없다`)
    }
  })

  test('산지 코드가 실제 WineRegion 코드다', () => {
    // 문서는 주요 국가만 싣는다(의도적 부분 목록) — 유령 코드만 막는다
    for (const code of mentionedRegionCodes(WHISKY)) {
      assert.ok(REGION_SET.has(code), `프롬프트의 산지 코드 '${code}' 가 WineRegion 에 없다`)
    }
  })

  test('스코틀랜드 법정 산지는 빠짐없이 실려 있다', () => {
    for (const code of REGION_CODES.filter((c) => c.startsWith('GB_SCT_'))) {
      assert.ok(WHISKY.includes(code), `${code} 가 프롬프트에 없다`)
    }
  })
})

describe('와인 프롬프트', () => {
  const cases = [
    ['WineType', 'WineType.java'],
    ['WineVintageStatus', 'WineVintageStatus.java'],
    ['WineCertification', 'WineCertification.java'],
  ]
  for (const [name, file] of cases) {
    test(`${name} 값이 모두 문서에 있다`, () => {
      for (const v of javaEnum(file)) {
        assert.ok(WINE.includes(v), `${name}.${v} 가 프롬프트에 없다`)
      }
    })
  }

  test('관능 5단계 값이 모두 문서에 있다', async () => {
    const { WINE_SWEETNESS_SCALE, WINE_BODY_SCALE, WINE_INTENSITY_SCALE } =
      await import('@/domain/spirit/data/wineTasteScale')
    for (const scale of [WINE_SWEETNESS_SCALE, WINE_BODY_SCALE, WINE_INTENSITY_SCALE]) {
      for (const v of scale) {
        assert.ok(WINE.includes(v), `관능 값 '${v}' 가 프롬프트에 없다`)
      }
    }
  })

  test('수확 방법·발효 용기 선택지가 문서와 일치한다', () => {
    // 드롭다운이라 문자열이 정확히 같지 않으면 저장되지 않는다
    for (const v of [...HARVEST_METHODS, ...FERMENTATION_VESSELS]) {
      assert.ok(WINE.includes(v), `선택지 '${v}' 가 프롬프트에 없다`)
    }
  })

  test('산지 코드가 실제 WineRegion 코드다', () => {
    for (const code of mentionedRegionCodes(WINE)) {
      assert.ok(REGION_SET.has(code), `프롬프트의 산지 코드 '${code}' 가 WineRegion 에 없다`)
    }
  })
})

// ── 수치 제약 ────────────────────────────────────────────

describe('수치 제약이 코드와 일치한다', async () => {
  const { ABV_MAX, VOLUME_ML_MIN, VOLUME_ML_MAX, YEAR_MIN } =
    await import('@/domain/spirit/data/spiritLimits')

  test('도수·용량 상하한이 세 프롬프트에 그대로 적혀 있다', () => {
    const volume = `${VOLUME_ML_MIN}~${VOLUME_ML_MAX}`
    for (const [name, text] of [['cognac', COGNAC], ['whisky', WHISKY], ['wine', WINE]]) {
      assert.ok(text.includes(`0~${ABV_MAX}`), `${name}: 도수 범위 0~${ABV_MAX} 표기 없음`)
      assert.ok(text.includes(volume), `${name}: 용량 범위 ${volume} 표기 없음`)
    }
  })

  test('빈티지 연도 하한이 꼬냑·와인 프롬프트에 적혀 있다', () => {
    // 위스키는 빈티지 입력란이 없어(증류/병입 연월로 대체) 해당하지 않는다
    for (const [name, text] of [['cognac', COGNAC], ['wine', WINE]]) {
      assert.ok(text.includes(String(YEAR_MIN)), `${name}: 연도 하한 ${YEAR_MIN} 표기 없음`)
    }
  })

  test('DTO 의 @Size·@Min·@Max 가 프롬프트 표기와 같다', () => {
    const dtoDir = join(REPO, 'caskbycask-api', 'src', 'main', 'java', 'com', 'caskbycask',
      'domain', 'spirit', 'dto')
    const limitOf = (file, field, ann) => {
      const src = readFileSync(join(dtoDir, file), 'utf8')
      const idx = src.indexOf(` ${field},`)
      assert.ok(idx > 0, `${file} 에서 ${field} 를 찾지 못했다`)
      // @Size(max = 300, ...) / @Max(value = 5000, ...) — 필드 바로 앞의 것을 쓴다
      const m = [...src.slice(0, idx).matchAll(new RegExp(`@${ann}\\((?:max|value) = (\\d+)`, 'g'))].pop()
      assert.ok(m, `${file}.${field} 의 @${ann} 를 찾지 못했다`)
      return Number(m[1])
    }
    const cases = [
      [COGNAC, 'CognacDetailRequest.java', 'blendDetail', 'Size'],
      [COGNAC, 'CognacDetailRequest.java', 'caskFinish', 'Size'],
      [WINE, 'WineDetailRequest.java', 'appellationDesignation', 'Size'],
      [WINE, 'WineDetailRequest.java', 'altitudeM', 'Max'],
      [WINE, 'WineDetailRequest.java', 'oakAgedMonths', 'Max'],
    ]
    for (const [text, file, field, ann] of cases) {
      const n = limitOf(file, field, ann)
      assert.ok(text.includes(String(n)), `${field} 의 제한값 ${n} 이 프롬프트에 없다`)
    }
  })
})

// ── 문서 구조 ────────────────────────────────────────────

describe('문서 구조', () => {
  for (const [name, text] of [['cognac', COGNAC], ['whisky', WHISKY], ['wine', WINE]]) {
    test(`${name}: 프롬프트 본문이 4중 백틱으로 온전히 감싸여 있다`, () => {
      // 안에 3중 백틱 코드펜스가 들어가므로 바깥은 반드시 4중이어야 한다
      const fences = (text.match(/^````\s*$/gm) || []).length
      assert.equal(fences, 2, '4중 백틱 펜스가 정확히 2개가 아니다 — 복사 범위가 깨진다')
    })

    test(`${name}: 기타 정보 400자 규칙과 조사 대상 자리가 있다`, () => {
      assert.ok(/`notes`.*400자 이내/.test(text), '기타 정보 400자 규칙이 없다')
      assert.ok(text.includes('## 조사 대상'), '조사 대상 자리가 없다')
    })

    test(`${name}: 예시 JSON 의 notes 가 400자 이내다`, () => {
      const m = /"notes": "([^"]*)"/.exec(text)
      assert.ok(m, '예시 JSON 에 notes 가 없다')
      assert.ok(m[1].length <= 400, `예시 notes 가 ${m[1].length}자 — AI 는 지시보다 예시를 따라한다`)
    })
  }

  test('세 문서가 서로 연결되어 있다', () => {
    assert.ok(WHISKY.includes('cognac-research-prompt.md'))
    assert.ok(WINE.includes('cognac-research-prompt.md'))
    assert.ok(WINE.includes('whisky-research-prompt.md'))
  })

  test('AGENTS.md 에 동기화 규칙이 남아 있다', () => {
    const agents = readFileSync(join(REPO, 'AGENTS.md'), 'utf8')
    assert.ok(agents.includes('주류 정보 조사 프롬프트'), 'AGENTS.md 에 동기화 규칙 절이 없다')
    for (const name of ['cognac', 'whisky', 'wine']) {
      assert.ok(agents.includes(`docs/${name}-research-prompt.md`), `AGENTS.md 에 ${name} 문서 경로가 없다`)
    }
  })
})
