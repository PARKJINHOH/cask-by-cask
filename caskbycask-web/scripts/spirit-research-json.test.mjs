/**
 * 조사 JSON 붙여넣기 → 관리자 등록 폼 채우기 검증.
 *
 * <p>이 경로의 실패는 조용하다 — 값이 안 들어갔거나 잘못 들어가도 화면은 멀쩡해 보이고,
 * 등록 버튼을 누른 뒤에야 400 이 나거나 틀린 데이터가 저장된다. 그래서 여기서 고정한다.
 *
 * 실행: npm run test:spirit-research-json
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOCS = join(HERE, '..', '..', 'docs')

const { parseSpiritResearchJson, buildImportPlan, applyImportPlan } =
  await import('@/domain/admin/utils/spiritResearchJson')

/**
 * 폼 API 를 흉내 내 호출을 기록한다.
 *
 * `renderedCategory` 는 **이번 렌더 시점의 카테고리**다 — React 상태는 이벤트 핸들러 안에서
 * 즉시 갱신되지 않으므로, `selectCategory` 의 "같으면 아무것도 안 함" 가드는 이 값과 비교한다.
 * 실제 폼과 같은 조건을 만들어야 "꼬냑 선택 → 꼬냑 JSON 붙여넣기" 회귀를 잡을 수 있다.
 */
function fakeForm(renderedCategory = null) {
  const calls = []
  const state = {
    category: null, nameKo: '', nameEn: '', country: null, countryCode: null,
    region: '', regionCode: null, isAbvRange: null, abvMin: '', abvMax: '',
    isVolumeMlRange: null, volumeMlMin: '', volumeMlMax: '',
    common: {}, whisky: {}, wine: {}, cognac: {},
    isVariantSplit: false, variantType: null,
    seriesIdentifier: '', seriesIdentifierEn: '', variants: [],
  }
  const rec = (name) => (...args) => { calls.push(name); return args }
  return {
    calls,
    state,
    reset: () => { calls.push('reset'); state.category = null },
    setCategory: (c) => { calls.push('setCategory'); state.category = c },
    selectCategory: (c) => {
      calls.push('selectCategory')
      if (c === renderedCategory) return // 실제 폼의 가드 — 렌더 시점 값과 비교한다
      state.category = c
    },
    setNameKo: (v) => { state.nameKo = v },
    setNameEn: (v) => { state.nameEn = v },
    setCountryValue: (code, name) => { state.countryCode = code; state.country = name },
    setRegion: (v) => { state.region = v },
    setRegionCode: (v) => { state.regionCode = v },
    setIsAbvRange: (v) => { state.isAbvRange = v },
    setAbvMin: (v) => { state.abvMin = v },
    setAbvMax: (v) => { state.abvMax = v },
    setIsVolumeMlRange: (v) => { state.isVolumeMlRange = v },
    setVolumeMlMin: (v) => { state.volumeMlMin = v },
    setVolumeMlMax: (v) => { state.volumeMlMax = v },
    updateCommon: (u) => { Object.assign(state.common, u) },
    updateWhisky: (u) => { Object.assign(state.whisky, u) },
    updateWine: (u) => { Object.assign(state.wine, u) },
    updateCognac: (u) => { Object.assign(state.cognac, u) },
    setIsVariantSplit: (v) => { state.isVariantSplit = v },
    setVariantType: (v) => { state.variantType = v },
    setSeriesIdentifier: (v) => { state.seriesIdentifier = v },
    setSeriesIdentifierEn: (v) => { state.seriesIdentifierEn = v },
    setVariants: (v) => { state.variants = v },
    setProducerId: rec('setProducerId'),
    setProducerName: rec('setProducerName'),
  }
}

/** 프롬프트 문서의 예시 JSON 을 그대로 꺼낸다 — 문서와 코드가 어긋나면 여기서 걸린다 */
function exampleFromDoc(name) {
  const src = readFileSync(join(DOCS, `${name}-research-prompt.md`), 'utf8')
  // 개행은 \r?\n 로 받는다 — 윈도우 체크아웃(CRLF)에서 문서가 멀쩡한데도 못 찾는 일이 없도록.
  const m = /```json\r?\n([\s\S]*?)```/.exec(src)
  assert.ok(m, `${name} 문서에서 예시 JSON 을 찾지 못했다`)
  return m[1]
}

const warnLabels = (plan) => plan.warnings.map((w) => w.label)

// ── 파싱 ────────────────────────────────────────────────

describe('parseSpiritResearchJson', () => {
  test('맨 JSON 객체', () => {
    const r = parseSpiritResearchJson('{"category":"WINE"}')
    assert.equal(r.ok, true)
    assert.equal(r.items.length, 1)
  })

  test('```json 코드펜스를 벗겨 낸다', () => {
    const r = parseSpiritResearchJson('```json\n{"category":"WINE"}\n```')
    assert.equal(r.ok, true)
    assert.equal(r.items[0].category, 'WINE')
  })

  test('앞뒤 설명 문장이 붙어 있어도 읽는다', () => {
    // AI 가 "조사 결과입니다:" 같은 말을 붙여 오는 경우
    const r = parseSpiritResearchJson('조사 결과입니다.\n{"category":"WINE"}\n확인해주세요.')
    assert.equal(r.ok, true)
    assert.equal(r.items[0].category, 'WINE')
  })

  test('배열이면 여러 건을 돌려준다', () => {
    const r = parseSpiritResearchJson('[{"category":"WINE"},{"category":"WHISKY"}]')
    assert.equal(r.ok, true)
    assert.equal(r.items.length, 2)
  })

  test('빈 입력·깨진 JSON 은 오류를 돌려준다', () => {
    assert.equal(parseSpiritResearchJson('').ok, false)
    assert.equal(parseSpiritResearchJson('   ').ok, false)
    assert.equal(parseSpiritResearchJson('{nope').ok, false)
    assert.equal(parseSpiritResearchJson('그냥 텍스트').ok, false)
  })
})

// ── 카테고리 ────────────────────────────────────────────

describe('category', () => {
  test('없거나 모르는 값이면 계획 자체를 거부한다', () => {
    // 카테고리를 못 정하면 어느 상세 칸에 넣을지 알 수 없다
    assert.equal(buildImportPlan({}).ok, false)
    assert.equal(buildImportPlan({ category: 'BEER' }).ok, false)
  })

  test('소문자도 받는다', () => {
    const r = buildImportPlan({ category: 'cognac' })
    assert.equal(r.ok, true)
    assert.equal(r.plan.category, 'COGNAC')
  })
})

// ── 문서 예시가 그대로 들어간다 ─────────────────────────

describe('프롬프트 문서의 예시 JSON 이 경고 없이 들어간다', () => {
  for (const name of ['cognac', 'whisky', 'wine']) {
    test(name, () => {
      const parsed = parseSpiritResearchJson(exampleFromDoc(name))
      assert.equal(parsed.ok, true)
      const built = buildImportPlan(parsed.items[0])
      assert.equal(built.ok, true, built.error)
      assert.deepEqual(
        built.plan.warnings, [],
        `문서 예시에서 경고가 났다: ${JSON.stringify(built.plan.warnings)}`,
      )
      assert.ok(built.plan.applied.length > 5, '채워진 항목이 너무 적다')
    })
  }

  test('꼬냑 예시가 폼의 올바른 칸으로 간다', () => {
    const built = buildImportPlan(parseSpiritResearchJson(exampleFromDoc('cognac')).items[0])
    const form = fakeForm()
    applyImportPlan(form, built.plan)

    assert.equal(form.state.category, 'COGNAC')
    assert.equal(form.state.nameKo, '헤네시 XO')
    assert.equal(form.state.countryCode, 'FR')
    assert.equal(form.state.regionCode, 'FR_COGNAC')
    assert.equal(form.state.cognac.grade, 'XO')
    assert.equal(form.state.cognac.cruComposition.length, 4)
    assert.deepEqual(form.state.cognac.oakTypes, ['LIMOUSIN', 'TRONCAIS'])
    // 도수·용량은 최상위가 아니라 공통 상세가 소유한다
    assert.equal(form.state.common.abv, '40')
    assert.equal(form.state.common.volumeMl, '700')
  })

  test('와인 예시가 폼의 올바른 칸으로 간다', () => {
    const built = buildImportPlan(parseSpiritResearchJson(exampleFromDoc('wine')).items[0])
    const form = fakeForm()
    applyImportPlan(form, built.plan)

    assert.equal(form.state.variantType, 'VINTAGE')
    assert.equal(form.state.variants.length, 1)
    assert.equal(form.state.variants[0].vintageYear, 2018)
    assert.equal(form.state.variants[0].wineDetail.wineType, 'RED')
    assert.equal(form.state.variants[0].wineDetail.grapeVarieties.length, 4)
    assert.equal(form.state.variants[0].wineDetail.harvestMethod, 'Hand-picked')
    assert.equal(form.state.variants[0].wineDetail.tannin, 'HIGH')
    assert.equal(form.state.variants[0].wineDetail.oakAgedMonths, '24')
  })

  test('위스키 예시가 폼의 올바른 칸으로 간다', () => {
    const built = buildImportPlan(parseSpiritResearchJson(exampleFromDoc('whisky')).items[0])
    const form = fakeForm()
    applyImportPlan(form, built.plan)

    assert.equal(form.state.whisky.style, 'SINGLE_MALT')
    assert.equal(form.state.whisky.bottlingType, 'OB')
    assert.deepEqual(form.state.whisky.caskTypes, ['EX_BOURBON', 'EX_SHERRY'])
    // 피니시는 별도 항목이 아니라 세부 오크통 명칭의 (Finish) 표기로 들어온다
    assert.deepEqual(form.state.whisky.caskDetails, {
      EX_BOURBON: ['American Oak Barrel'],
      EX_SHERRY: ['Oloroso Sherry Butt (Finish)'],
    })
    assert.equal(form.state.common.ageStatement, 12)
    assert.equal(form.state.countryCode, 'GB-SCT')
  })
})

// ── 허용 값이 아닌 값은 버리고 알린다 ───────────────────

describe('모르는 값은 넣지 않고 경고한다', () => {
  test('꼬냑 등급·오크', () => {
    // 조용히 넣으면 화면엔 미선택으로 보이고 저장 시 400 이 난다
    const { plan } = buildImportPlan({
      category: 'COGNAC', grade: 'SUPER_XO', oakTypes: ['LIMOUSIN', 'NOT_A_FOREST'],
    })
    assert.equal(plan.cognacDetail.grade, undefined)
    assert.deepEqual(plan.cognacDetail.oakTypes, ['LIMOUSIN'])
    assert.ok(warnLabels(plan).includes('등급'))
    assert.ok(warnLabels(plan).includes('오크 종류'))
  })

  test('위스키 스타일·캐스크', () => {
    const { plan } = buildImportPlan({
      category: 'WHISKY', style: 'MOONSHINE',
      casks: [{ code: 'EX_SHERRY' }, { code: 'EX_SOJU' }],
    })
    assert.equal(plan.whiskyDetail.style, undefined)
    assert.deepEqual(plan.whiskyDetail.caskTypes, ['EX_SHERRY'])
    assert.ok(warnLabels(plan).includes('캐스크'))
  })

  test('와인 드롭다운은 문자열이 정확히 같아야 한다', () => {
    // select 라 비슷한 문자열은 선택되지 않는다
    const { plan } = buildImportPlan({
      category: 'WINE', harvestMethod: 'Hand harvested', fermentationVessel: 'Oak Vat',
    })
    assert.equal(plan.wineDetail.harvestMethod, undefined)
    assert.equal(plan.wineDetail.fermentationVessel, 'Oak Vat')
    assert.ok(warnLabels(plan).includes('수확 방법'))
  })

  test('범위를 벗어난 숫자', () => {
    const { plan } = buildImportPlan({ category: 'COGNAC', abv: 140, volumeMl: 999_999 })
    assert.equal(plan.commonDetail.abv, undefined)
    assert.equal(plan.commonDetail.volumeMl, undefined)
    assert.equal(plan.warnings.length, 2)
  })

  test('날짜 형식이 어긋나면 건너뛴다', () => {
    const { plan } = buildImportPlan({
      category: 'WHISKY', bottledDate: '2024/03', distilledDate: '2011-13',
    })
    assert.equal(plan.commonDetail.bottledDate, undefined)
    assert.equal(plan.commonDetail.distilledDate, undefined)
  })
})

// ── 길이·비율 ───────────────────────────────────────────

describe('길이·비율', () => {
  test('길이 초과는 잘라내고 알린다', () => {
    // 그대로 넣으면 백엔드 @Size 에서 400 이 난다
    const { plan } = buildImportPlan({ category: 'COGNAC', notes: 'ㄱ'.repeat(700) })
    assert.equal(plan.cognacDetail.notes.length, 500)
    assert.ok(warnLabels(plan).includes('기타 정보'))
  })

  test('크뤼 중복은 한 번만 넣는다', () => {
    const { plan } = buildImportPlan({
      category: 'COGNAC',
      cruComposition: [
        { cru: 'GRANDE_CHAMPAGNE', percentage: 50 },
        { cru: 'GRANDE_CHAMPAGNE', percentage: 30 },
      ],
    })
    assert.equal(plan.cognacDetail.cruComposition.length, 1)
    assert.ok(warnLabels(plan).includes('크뤼 구성'))
  })

  test('비율 합계 초과는 넣되 경고한다 — 사람이 고쳐야 한다', () => {
    const { plan } = buildImportPlan({
      category: 'WINE',
      grapeVarieties: [{ name: 'Merlot', percentage: 70 }, { name: 'Syrah', percentage: 50 }],
    })
    assert.equal(plan.wineDetail.grapeVarieties.length, 2)
    assert.ok(plan.warnings.some((w) => w.message.includes('120%')))
  })
})

// ── 폼 규칙과 맞물리는 조건부 필드 ──────────────────────

describe('폼이 잠그는 칸은 채우지 않는다', () => {
  test('오크 숙성이 아니면 오크 종류·기간을 넣지 않는다', () => {
    const { plan } = buildImportPlan({
      category: 'WINE', isOakAged: false, oakType: 'French Oak', oakAgedMonths: 24,
    })
    assert.equal(plan.wineDetail.isOakAged, false)
    assert.equal(plan.wineDetail.oakType, undefined)
    assert.equal(plan.wineDetail.oakAgedMonths, undefined)
  })

  test('피트가 아니면 페놀 수치를 넣지 않는다', () => {
    const { plan } = buildImportPlan({ category: 'WHISKY', isPeated: false, phenolPpm: 55 })
    assert.equal(plan.whiskyDetail.phenolPpm, undefined)
  })

  test('NAS 면 숙성 연수를 넣지 않는다', () => {
    const { plan } = buildImportPlan({ category: 'WHISKY', isNas: true, ageStatement: 12 })
    assert.equal(plan.commonDetail.isNas, true)
    assert.equal(plan.commonDetail.ageStatement, undefined)
  })

  test('논빈티지면 빈티지 연도를 비운다', () => {
    const { plan } = buildImportPlan({
      category: 'WINE', vintageStatus: 'NON_VINTAGE', vintageYear: 2020,
    })
    assert.equal(plan.wineDetail.vintageYear, '')
  })

  test('스타일이 OTHER 가 아니면 직접 입력값을 넣지 않는다', () => {
    const { plan } = buildImportPlan({
      category: 'WHISKY', style: 'SINGLE_MALT', styleOther: '라이트 위스키',
    })
    assert.equal(plan.whiskyDetail.styleOther, undefined)
  })

  test('와인은 병입 정보를 만들지 않는다 (폼에서 숨겨진 칸)', () => {
    const { plan } = buildImportPlan({
      category: 'WINE', bottledDate: '2020-03', bottleNo: '12/500', totalBottles: 500,
    })
    assert.equal(plan.commonDetail.bottledDate, undefined)
    assert.equal(plan.commonDetail.bottleNo, undefined)
  })
})

// ── 도수 범위 ───────────────────────────────────────────

describe('도수', () => {
  test('단일 도수는 공통 상세로, 범위 지정은 끈다', () => {
    const { plan } = buildImportPlan({ category: 'WHISKY', abv: 43 })
    assert.equal(plan.commonDetail.abv, '43')
    assert.equal(plan.fields.isAbvRange, false)
  })

  test('min/max 만 있으면 범위 지정을 켠다', () => {
    const { plan } = buildImportPlan({ category: 'WHISKY', abvMin: 54, abvMax: 56 })
    assert.equal(plan.fields.isAbvRange, true)
    assert.equal(plan.fields.abvMin, '54')
    assert.equal(plan.commonDetail.abv, undefined)
  })
})

// ── 용량 범위 ───────────────────────────────────────────

describe('용량', () => {
  test('단일 용량은 공통 상세로, 범위 지정은 끈다', () => {
    const { plan } = buildImportPlan({ category: 'WHISKY', volumeMl: 700 })
    assert.equal(plan.commonDetail.volumeMl, '700')
    assert.equal(plan.fields.isVolumeMlRange, false)
  })

  test('min/max 만 있으면 범위 지정을 켜고 용량을 필수 누락으로 보지 않는다', () => {
    // 폼·백엔드는 용량 범위를 받는데 붙여넣기만 못 읽으면 700/750 두 규격 제품이 매번 손입력이 된다
    const { plan } = buildImportPlan({ category: 'WHISKY', volumeMlMin: 700, volumeMlMax: 750 })
    assert.equal(plan.fields.isVolumeMlRange, true)
    assert.equal(plan.fields.volumeMlMin, '700')
    assert.equal(plan.fields.volumeMlMax, '750')
    assert.equal(plan.commonDetail.volumeMl, undefined)
    assert.ok(!plan.missingRequired.includes('용량'))
  })

  test('범위가 폼에 그대로 들어간다', () => {
    const { plan } = buildImportPlan({ category: 'WHISKY', volumeMlMin: 700, volumeMlMax: 750 })
    const form = fakeForm()
    applyImportPlan(form, plan)
    assert.equal(form.state.isVolumeMlRange, true)
    assert.equal(form.state.volumeMlMin, '700')
    assert.equal(form.state.volumeMlMax, '750')
  })
})

// ── 국가·산지 ───────────────────────────────────────────

describe('국가·산지 코드', () => {
  test('스카치는 영국이 아니라 스코틀랜드로 잡힌다', () => {
    // 산지 코드 GB_SCT_* 는 국가 코드 GB-SCT 에 속한다 — '영국'(GB)으로 잡으면 산지와 어긋난다
    const { plan } = buildImportPlan({ category: 'WHISKY', country: '스코틀랜드' })
    assert.equal(plan.fields.countryCode, 'GB-SCT')
  })

  test("'영국(스코틀랜드)' 처럼 괄호가 붙어도 국가를 찾는다", () => {
    const { plan } = buildImportPlan({ category: 'WHISKY', country: '영국(스코틀랜드)' })
    assert.equal(plan.fields.countryCode, 'GB')
    assert.equal(plan.fields.country, '영국')
  })

  test('모르는 국가는 넣지 않고 알린다', () => {
    const { plan } = buildImportPlan({ category: 'WHISKY', country: '스카치랜드' })
    assert.equal(plan.fields.countryCode, undefined)
    assert.ok(warnLabels(plan).includes('국가'))
  })

  test('산지 코드 형식이 아니면 건너뛴다', () => {
    const { plan } = buildImportPlan({ category: 'WINE', regionCode: '보르도' })
    assert.equal(plan.fields.regionCode, undefined)
  })
})

// ── 에디션 ──────────────────────────────────────────────

describe('에디션', () => {
  const editions = {
    category: 'WHISKY',
    editions: {
      variantType: 'BATCH',
      seriesIdentifier: '배치 시리즈',
      seriesIdentifierEn: 'Batch Series',
      items: [
        { variantValue: '배치 15', variantValueEn: 'Batch 15', abv: 54.8, bottledDate: '2024-01' },
        { variantValue: '배치 16', abv: 55.2 },
      ],
    },
  }

  test('폼의 하위 에디션으로 옮긴다', () => {
    const { plan } = buildImportPlan(editions)
    const form = fakeForm()
    applyImportPlan(form, plan)

    assert.equal(form.state.isVariantSplit, true)
    assert.equal(form.state.variantType, 'BATCH')
    assert.equal(form.state.seriesIdentifier, '배치 시리즈')
    assert.equal(form.state.variants.length, 2)
    assert.equal(form.state.variants[0].variantValue, '배치 15')
    assert.equal(form.state.variants[0].commonDetail.bottledDate, '2024-01')
    // 폼이 tempId 로 탭을 구분하므로 반드시 있어야 한다
    assert.ok(form.state.variants.every((v) => v.tempId))
  })

  test('에디션 도수·용량은 에디션 카드가 읽는 최상위에 둔다', () => {
    // 에디션 카드는 variant.abv / variant.volumeMl 을 직접 편집한다.
    // commonDetail 안에 넣으면 화면에는 빈칸으로 보이면서 값은 저장돼 어긋난다.
    const { plan } = buildImportPlan(editions)
    assert.equal(plan.variants.items[0].abv, 54.8)
    assert.equal(plan.variants.items[0].commonDetail.abv, undefined)
  })

  test('에디션 기타 정보를 버리지 않는다', () => {
    const { plan } = buildImportPlan({
      category: 'WHISKY',
      editions: {
        variantType: 'BATCH', seriesIdentifier: 'S',
        items: [{ variantValue: '배치 1', notes: '이 배치는 셰리 비중이 높다' }],
      },
    })
    assert.equal(plan.variants.items[0].whiskyDetail.notes, '이 배치는 셰리 비중이 높다')
  })

  test('식별 값이 없는 항목은 건너뛴다', () => {
    const { plan } = buildImportPlan({
      category: 'WHISKY',
      editions: { variantType: 'BATCH', seriesIdentifier: 'S', items: [{ abv: 50 }] },
    })
    assert.equal(plan.variants, null)
  })

  test('유형이 올바르지 않으면 에디션 전체를 건너뛴다', () => {
    const { plan } = buildImportPlan({
      category: 'WHISKY',
      editions: { variantType: 'YEARLY', seriesIdentifier: 'S', items: [{ variantValue: 'a' }] },
    })
    assert.equal(plan.variants, null)
    assert.ok(warnLabels(plan).includes('에디션'))
  })

  test('시리즈 식별자가 비면 알린다 — 필수 항목이다', () => {
    const { plan } = buildImportPlan({
      category: 'WHISKY',
      editions: { variantType: 'BATCH', items: [{ variantValue: '배치 1' }] },
    })
    assert.ok(plan.variants)
    assert.ok(plan.warnings.some((w) => w.message.includes('필수')))
  })

  test('editions 가 null 이면 정규 제품으로 둔다', () => {
    const { plan } = buildImportPlan({ category: 'WHISKY', editions: null })
    assert.equal(plan.variants, null)
    const form = fakeForm()
    applyImportPlan(form, plan)
    assert.equal(form.state.isVariantSplit, false)
  })

  test('에디션이 직접 적은 숙성·특성·피트를 그대로 옮긴다', () => {
    // 에디션 카드는 숙성(NAS/연수/증류연월)·특성 체크박스·피트 ppm 을 모두 렌더한다.
    // 여기서 빠지면 화면은 빈칸인데 경고도 없는 조용한 실패가 된다.
    const { plan } = buildImportPlan({
      category: 'WHISKY',
      editions: {
        variantType: 'BATCH', seriesIdentifier: 'S',
        items: [{
          variantValue: '배치 1',
          isNas: false, ageStatement: 12, ageStatementMonths: 6, distilledDate: '2010-03',
          bottleNo: '123/500',
          isNonChillFiltered: true, isNaturalColour: true, isSingleCask: true,
          isCaskStrength: true, isPeated: true, phenolPpm: 55,
        }],
      },
    })
    const { commonDetail, whiskyDetail } = plan.variants.items[0]
    assert.deepEqual(commonDetail, {
      isNas: false, ageStatement: 12, ageStatementMonths: 6, distilledDate: '2010-03',
      bottleNo: '123/500',
    })
    assert.equal(whiskyDetail.isNonChillFiltered, true)
    assert.equal(whiskyDetail.isSingleCask, true)
    assert.equal(whiskyDetail.isPeated, true)
    // 에디션 상세는 요청 DTO 형태라 숫자로 들어가야 한다(마스터는 폼 형태라 문자열)
    assert.equal(whiskyDetail.phenolPpm, 55)
  })

  test('에디션이 비워 둔 값은 최상위에서 물려받는다', () => {
    // 프롬프트가 "모든 에디션이 같으면 최상위에만" 이라고 안내하는데,
    // 위스키에 에디션이 있으면 화면이 최상위 상세 카드를 숨긴다 —
    // 내려보내지 않으면 사람이 검수할 수 없다.
    const { plan } = buildImportPlan({
      category: 'WHISKY',
      abv: 46.3, volumeMl: 700,
      isNas: false, ageStatement: 12,
      isNonChillFiltered: true, isPeated: true, phenolPpm: 55,
      casks: [{ code: 'EX_SHERRY', details: ['Oloroso Sherry Butt'] }],
      notes: '제품 전체 설명',
      editions: {
        variantType: 'BATCH', seriesIdentifier: 'S',
        items: [
          { variantValue: '배치 1', abv: null, volumeMl: null, ageStatement: null, casks: null },
          { variantValue: '배치 2', abv: 54.8, isSingleCask: true },
        ],
      },
    })
    const [first, second] = plan.variants.items
    assert.equal(first.abv, 46.3)
    assert.equal(first.volumeMl, 700)
    assert.equal(first.commonDetail.ageStatement, 12)
    assert.equal(first.whiskyDetail.isNonChillFiltered, true)
    assert.equal(first.whiskyDetail.phenolPpm, 55)
    assert.deepEqual(first.whiskyDetail.caskTypes, ['EX_SHERRY'])
    // 에디션이 직접 적은 값이 최상위를 이긴다
    assert.equal(second.abv, 54.8)
    assert.equal(second.whiskyDetail.isSingleCask, true)
    // 제품 설명·병입분 고유 정보는 물려받지 않는다 — 에디션마다 달라야 한다
    assert.equal(first.whiskyDetail.notes, undefined)
    assert.equal(first.commonDetail.bottledDate, undefined)
  })

  test('최상위 도수가 범위면 에디션이 물려받지 않는다', () => {
    // 에디션 카드의 도수는 단일 입력칸이라 범위를 옮길 자리가 없다
    const { plan } = buildImportPlan({
      category: 'WHISKY', abv: null, abvMin: 56.4, abvMax: 60.1, volumeMl: 700,
      editions: {
        variantType: 'RELEASE_YEAR', seriesIdentifier: '연간 릴리즈',
        items: [{ variantValue: '2025 에디션', abv: 56.4, volumeMl: null }],
      },
    })
    assert.equal(plan.variants.items[0].abv, 56.4)
    assert.equal(plan.variants.items[0].volumeMl, 700)
  })

  test('에디션이 casks: [] 로 적으면 최상위 캐스크를 물려받지 않는다', () => {
    // 빈 배열은 프롬프트에서 "캐스크 미상"이라는 뜻이다 — null 과 구분한다
    const { plan } = buildImportPlan({
      category: 'WHISKY',
      casks: [{ code: 'EX_SHERRY', details: ['Oloroso Sherry Butt'] }],
      editions: {
        variantType: 'BATCH', seriesIdentifier: 'S',
        items: [{ variantValue: '배치 1', casks: [] }],
      },
    })
    assert.equal(plan.variants.items[0].whiskyDetail.caskTypes, undefined)
  })
})

// ── 신뢰도 신호 ─────────────────────────────────────────

describe('신뢰도 신호는 버리지 않는다', () => {
  // 프롬프트가 공들여 만들게 한 값이다. 조용히 버리면 확인 없이 등록된다.
  test('_confidence·_uncertain·_sources·_nameKoBasis 를 그대로 넘긴다', () => {
    const { plan } = buildImportPlan({
      category: 'COGNAC',
      _confidence: '낮음',
      _uncertain: ['크뤼 비율 비공개'],
      _sources: ['https://example.com/a'],
      _nameKoBasis: '수입사 표기',
    })
    assert.equal(plan.meta.confidence, '낮음')
    assert.deepEqual(plan.meta.uncertain, ['크뤼 비율 비공개'])
    assert.deepEqual(plan.meta.sources, ['https://example.com/a'])
    assert.equal(plan.meta.nameKoBasis, '수입사 표기')
  })

  test('없으면 빈 값', () => {
    const { plan } = buildImportPlan({ category: 'COGNAC' })
    assert.equal(plan.meta.confidence, null)
    assert.deepEqual(plan.meta.uncertain, [])
    assert.deepEqual(plan.meta.sources, [])
  })

  test('문서 예시 3종의 신뢰도 신호가 모두 읽힌다', () => {
    for (const name of ['cognac', 'whisky', 'wine']) {
      const { plan } = buildImportPlan(parseSpiritResearchJson(exampleFromDoc(name)).items[0])
      assert.ok(plan.meta.confidence, `${name}: _confidence 를 읽지 못했다`)
      assert.ok(plan.meta.sources.length > 0, `${name}: _sources 를 읽지 못했다`)
    }
  })
})

// ── 필수 항목 안내 ──────────────────────────────────────

describe('필수 항목이 비면 미리 알린다', () => {
  // 폼 validate 가 등록 시 막지만, 붙여넣기 직후에 알아야 손이 덜 간다
  test('꼬냑은 등급이 필수', () => {
    const { plan } = buildImportPlan({ category: 'COGNAC' })
    assert.ok(plan.missingRequired.includes('등급'))
  })

  test('위스키는 스타일이 필수', () => {
    const { plan } = buildImportPlan({ category: 'WHISKY' })
    assert.ok(plan.missingRequired.includes('위스키 스타일'))
  })

  test('위스키는 증류소 대신 브랜드명만 있어도 생산자를 요구하지 않는다', () => {
    // 폼은 증류소 또는 브랜드명 중 하나를 받는다 — 블렌디드는 라벨에 브랜드만 있는 경우가 흔하다
    const { plan } = buildImportPlan({ category: 'WHISKY', style: 'BLENDED_WHISKY', brandName: '조니워커' })
    assert.ok(!plan.missingRequired.includes('생산자'))
  })

  test('증류소도 브랜드명도 없으면 생산자를 알린다', () => {
    const { plan } = buildImportPlan({ category: 'WHISKY', style: 'BLENDED_WHISKY' })
    assert.ok(plan.missingRequired.includes('생산자'))
  })

  test('와인은 종류와 빈티지 연도가 필수', () => {
    const { plan } = buildImportPlan({ category: 'WINE' })
    assert.ok(plan.missingRequired.includes('와인 종류'))
    assert.ok(plan.missingRequired.includes('빈티지 연도'))
  })

  test('논빈티지 와인은 빈티지 연도를 요구하지 않는다', () => {
    const { plan } = buildImportPlan({ category: 'WINE', vintageStatus: 'NON_VINTAGE' })
    assert.ok(!plan.missingRequired.includes('빈티지 연도'))
  })

  test('에디션으로 나뉘면 마스터 도수·용량을 요구하지 않는다', () => {
    const { plan } = buildImportPlan({
      category: 'WHISKY', style: 'SINGLE_MALT',
      editions: { variantType: 'BATCH', seriesIdentifier: 'S', items: [{ variantValue: '배치 1' }] },
    })
    assert.ok(!plan.missingRequired.includes('알코올 도수'))
    assert.ok(!plan.missingRequired.includes('용량'))
  })

  test('문서 예시 3종은 필수 항목이 비지 않는다', () => {
    for (const name of ['cognac', 'whisky', 'wine']) {
      const { plan } = buildImportPlan(parseSpiritResearchJson(exampleFromDoc(name)).items[0])
      assert.deepEqual(plan.missingRequired, [], `${name}: ${plan.missingRequired.join(', ')}`)
    }
  })
})

// ── 적용 절차 ───────────────────────────────────────────

describe('applyImportPlan', () => {
  test('항상 먼저 폼을 비운다 — 두 번 붙여넣어도 값이 섞이지 않는다', () => {
    const { plan } = buildImportPlan({ category: 'WINE', nameKo: '테스트' })
    const form = fakeForm()
    applyImportPlan(form, plan)
    assert.equal(form.calls[0], 'reset')
    assert.equal(form.calls[1], 'setCategory')
  })

  // 회귀: 꼬냑을 이미 고른 상태에서 꼬냑 JSON 을 붙여넣으면 상세 카드가 사라졌다.
  // reset() 이 카테고리를 비우는데 selectCategory 의 "같으면 아무것도 안 함" 가드가
  // **렌더 시점의 옛 값**과 비교해 통과해 버려, setCategory 가 실행되지 않았다.
  for (const category of ['COGNAC', 'WHISKY', 'WINE']) {
    test(`${category} 를 이미 고른 상태에서 같은 카테고리를 붙여넣어도 카테고리가 유지된다`, () => {
      const { plan } = buildImportPlan({ category, nameKo: '테스트' })
      const form = fakeForm(category) // 화면에 이미 이 카테고리가 선택되어 있다
      applyImportPlan(form, plan)
      assert.equal(form.state.category, category, '카테고리가 비어 상세 입력이 사라진다')
    })
  }

  test('다른 카테고리로 바꿔 붙여넣어도 정상 반영된다', () => {
    const { plan } = buildImportPlan({ category: 'WINE', nameKo: '테스트' })
    const form = fakeForm('COGNAC')
    applyImportPlan(form, plan)
    assert.equal(form.state.category, 'WINE')
  })

  test('생산자는 이름만 넘기고 연결은 화면이 한다', () => {
    const { plan } = buildImportPlan({
      category: 'COGNAC', producer: { nameKo: '헤네시', nameEn: 'Hennessy' },
    })
    assert.equal(plan.producerName, '헤네시')
  })

  test('생산자가 없으면 null', () => {
    const { plan } = buildImportPlan({ category: 'COGNAC' })
    assert.equal(plan.producerName, null)
  })
})
