/**
 * 지역 라벨 지역화 검증.
 *
 * `spirit.region` 텍스트는 와인 산지 코드 지정 시 **L1 한글 산지명으로 동기화**된다.
 * 그런데 기존 텍스트 사전(REGION_SUGGESTIONS)에는 샹파뉴·보졸레·쉬드우에스트 같은
 * 산지가 없어서, 텍스트만 보고 번역하면 영어 모드에서 한글이 그대로 노출된다.
 * 백엔드가 내려준 ko/en 산지명을 우선 쓰는지 여기서 고정한다.
 *
 * 실행: npm run test:region-label
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(HERE, '..')
const ENUM_PATH = join(
  WEB_ROOT, '..', 'caskbycask-api', 'src', 'main', 'java', 'com', 'caskbycask',
  'domain', 'spirit', 'entity', 'enums', 'WineRegion.java',
)

// 순수 함수만 가져온다 — `@/` 별칭은 test-alias-register.mjs 훅이 해석한다
const { localizeRegion, localizeSpiritRegion } =
  await import('@/shared/utils/regionName')

const region = (code, cc, ko, en, parent = null, parentKo = null, parentEn = null) => ({
  code, countryCode: cc, nameKo: ko, nameEn: en,
  parentCode: parent, parentNameKo: parentKo, parentNameEn: parentEn,
})

describe('localizeSpiritRegion — 산지 코드 우선', () => {
  test('L1 만 선택되면 L1 이름을 언어에 맞게 반환한다', () => {
    const r = region('FR_CHAMPAGNE', 'FR', '샹파뉴', 'Champagne')
    assert.equal(localizeSpiritRegion(r, '샹파뉴', 'ko'), '샹파뉴')
    assert.equal(localizeSpiritRegion(r, '샹파뉴', 'en'), 'Champagne')
  })

  test('L2 까지 선택되면 "L1 · L2" 로 더 구체적으로 보여준다', () => {
    const r = region('FR_BORDEAUX_MEDOC', 'FR', '메독', 'Médoc', 'FR_BORDEAUX', '보르도', 'Bordeaux')
    assert.equal(localizeSpiritRegion(r, '보르도', 'ko'), '보르도 · 메독')
    assert.equal(localizeSpiritRegion(r, '보르도', 'en'), 'Bordeaux · Médoc')
  })

  test('회귀: 텍스트 사전에 없는 산지도 영어로 번역된다', () => {
    // 이 산지들은 REGION_SUGGESTIONS 에 없어 localizeRegion 만으로는 번역되지 않는다
    const cases = [
      ['FR_BEAUJOLAIS', 'FR', '보졸레', 'Beaujolais'],
      ['FR_SUD_OUEST', 'FR', '쉬드우에스트', 'South West France'],
      ['IT_PUGLIA', 'IT', '풀리아', 'Puglia'],
      ['CL_CENTRAL_VALLEY', 'CL', '센트럴밸리', 'Central Valley'],
    ]
    for (const [code, cc, ko, en] of cases) {
      assert.equal(localizeRegion(ko, 'en'), ko, `사전에는 여전히 없어야 한다: ${ko}`)
      assert.equal(localizeSpiritRegion(region(code, cc, ko, en), ko, 'en'), en)
    }
  })

  test('산지 코드가 없으면 기존 텍스트 사전으로 폴백한다 (위스키 등 무영향)', () => {
    assert.equal(localizeSpiritRegion(null, '스페이사이드', 'en'), 'Speyside')
    assert.equal(localizeSpiritRegion(undefined, 'Speyside', 'ko'), '스페이사이드')
    assert.equal(localizeSpiritRegion(null, null, 'en'), '')
  })
})

describe('카탈로그 전수 검사', () => {
  test('모든 L1 산지가 영어 모드에서 영문명으로 나온다', () => {
    const src = readFileSync(ENUM_PATH, 'utf8')
    const rx =
    /^ {4}([A-Z][A-Z0-9_]+)\("([A-Z]{2}(?:-[A-Z]{2,3})?)", "([^"]*)", "([^"]*)", (null|"[A-Z0-9_]+")[,)]/gm
    const l1 = []
    let m
    while ((m = rx.exec(src)) !== null) {
      if (m[5] === 'null') l1.push({ code: m[1], cc: m[2], ko: m[3], en: m[4] })
    }
    assert.ok(l1.length > 40, `L1 파싱 실패 (${l1.length}개)`)

    for (const r of l1) {
      const label = localizeSpiritRegion(region(r.code, r.cc, r.ko, r.en), r.ko, 'en')
      assert.equal(label, r.en, `${r.code} 영어 라벨 불일치`)
      assert.doesNotMatch(label, /[가-힣]/, `${r.code} 영어 모드에 한글이 남았다`)
    }
  })
})
