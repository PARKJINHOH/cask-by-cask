/**
 * 와인 산지 2단 선택 로직 검증.
 *
 * 산지 코드 하나(L1 또는 L2)만 저장하므로 선택기 표시 상태는 항상 역산된다.
 * 그 역산이 틀리면 관리자가 저장한 산지가 재편집 시 사라지므로 여기서 고정한다.
 *
 * 실행: npm run test:wine-region
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  indexRegionsByCode,
  resolveRegionSelection,
  resolveL2Change,
  topLevelOf,
} from '../src/domain/location/data/wineRegionSelection.ts'

const node = (code, countryCode, nameKo, nameEn, parentCode, children = []) => ({
  code, countryCode, nameKo, nameEn, parentCode, children,
})

/** 백엔드 GET /api/wine-regions 응답 형태를 축약한 픽스처 */
const CATALOG = [
  {
    countryCode: 'FR',
    regions: [
      node('FR_BORDEAUX', 'FR', '보르도', 'Bordeaux', null, [
        node('FR_BORDEAUX_MEDOC', 'FR', '메독', 'Médoc', 'FR_BORDEAUX'),
        node('FR_BORDEAUX_POMEROL', 'FR', '포므롤', 'Pomerol', 'FR_BORDEAUX'),
      ]),
      // L2 가 없는 L1 — 확대 지도가 생략되는 경우
      node('FR_CHAMPAGNE', 'FR', '샹파뉴', 'Champagne', null, []),
    ],
  },
  {
    countryCode: 'IT',
    regions: [
      node('IT_PIEMONTE', 'IT', '피에몬테', 'Piedmont', null, [
        node('IT_PIEMONTE_BAROLO', 'IT', '바롤로', 'Barolo', 'IT_PIEMONTE'),
      ]),
    ],
  },
]

const byCode = indexRegionsByCode(CATALOG)

describe('indexRegionsByCode', () => {
  test('L1 과 L2 를 모두 인덱싱한다', () => {
    assert.equal(byCode.size, 6)
    assert.equal(byCode.get('FR_BORDEAUX').nameKo, '보르도')
    assert.equal(byCode.get('FR_BORDEAUX_MEDOC').nameKo, '메독')
    assert.equal(byCode.get('IT_PIEMONTE_BAROLO').nameKo, '바롤로')
  })

  test('children 이 없어도 안전하다', () => {
    const idx = indexRegionsByCode([
      { countryCode: 'FR', regions: [{ code: 'X', countryCode: 'FR', nameKo: 'x', nameEn: 'x', parentCode: null }] },
    ])
    assert.equal(idx.size, 1)
  })
})

describe('resolveRegionSelection', () => {
  test('L2 코드는 L1 과 L2 를 모두 선택 상태로 만든다', () => {
    const s = resolveRegionSelection('FR_BORDEAUX_MEDOC', byCode)
    assert.equal(s.l1Code, 'FR_BORDEAUX')
    assert.equal(s.l2Code, 'FR_BORDEAUX_MEDOC')
    assert.equal(s.l1.nameKo, '보르도')
    assert.deepEqual(s.subRegions.map((n) => n.code), ['FR_BORDEAUX_MEDOC', 'FR_BORDEAUX_POMEROL'])
  })

  test('L1 코드는 L2 를 비워 확대 지도를 생략하게 한다', () => {
    const s = resolveRegionSelection('FR_BORDEAUX', byCode)
    assert.equal(s.l1Code, 'FR_BORDEAUX')
    assert.equal(s.l2Code, '')
    assert.equal(s.subRegions.length, 2)
  })

  test('L2 가 없는 L1 은 subRegions 가 비어 L2 select 가 숨는다', () => {
    const s = resolveRegionSelection('FR_CHAMPAGNE', byCode)
    assert.equal(s.l1Code, 'FR_CHAMPAGNE')
    assert.equal(s.l2Code, '')
    assert.deepEqual(s.subRegions, [])
  })

  test('null / 빈 문자열 / 카탈로그에 없는 코드는 미선택 상태', () => {
    for (const input of [null, undefined, '', 'FR_UNKNOWN']) {
      const s = resolveRegionSelection(input, byCode)
      assert.equal(s.l1Code, '', `input=${String(input)}`)
      assert.equal(s.l2Code, '')
      assert.equal(s.l1, undefined)
      assert.deepEqual(s.subRegions, [])
    }
  })
})

describe('topLevelOf', () => {
  test('L2 는 부모 L1 을, L1 은 자신을 반환한다', () => {
    assert.equal(topLevelOf('FR_BORDEAUX_MEDOC', byCode).code, 'FR_BORDEAUX')
    assert.equal(topLevelOf('FR_BORDEAUX', byCode).code, 'FR_BORDEAUX')
    assert.equal(topLevelOf('IT_PIEMONTE_BAROLO', byCode).nameKo, '피에몬테')
  })

  test('알 수 없는 코드는 undefined', () => {
    assert.equal(topLevelOf('NOPE', byCode), undefined)
    assert.equal(topLevelOf(null, byCode), undefined)
  })
})

describe('resolveL2Change', () => {
  test("'전체'(빈 값)를 고르면 L1 만 남는다", () => {
    assert.equal(resolveL2Change('', 'FR_BORDEAUX'), 'FR_BORDEAUX')
  })

  test('L2 를 고르면 그 코드가 저장된다', () => {
    assert.equal(resolveL2Change('FR_BORDEAUX_POMEROL', 'FR_BORDEAUX'), 'FR_BORDEAUX_POMEROL')
  })

  test('L1 조차 없으면 null (산지 해제)', () => {
    assert.equal(resolveL2Change('', ''), null)
  })
})
