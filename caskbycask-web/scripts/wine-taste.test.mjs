/**
 * 와인 맛 지표 5단계 척도 검증.
 *
 * 값과 순서의 단일 소스는 백엔드 enum 이다. 프론트 척도 배열이 어긋나면
 * 바가 잘못된 단계로 채워지므로(예: 타닌 '높음'이 3/5 로 표시) 여기서 고정한다.
 *
 * 실행: npm run test:wine-taste
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ENUM_DIR = join(
  HERE, '..', '..', 'caskbycask-api', 'src', 'main', 'java', 'com', 'caskbycask',
  'domain', 'spirit', 'entity', 'enums',
)
const LOCALES = join(HERE, '..', 'src', 'locales')

const {
  WINE_SWEETNESS_SCALE, WINE_BODY_SCALE, WINE_INTENSITY_SCALE,
  WINE_TASTE_MAX_LEVEL, WINE_TASTE_AXES, tasteLevel,
} = await import('@/domain/spirit/data/wineTasteScale')

/** Java enum 에서 `NAME(level)` 을 순서대로 뽑는다 */
function parseEnum(file) {
  const src = readFileSync(join(ENUM_DIR, file), 'utf8')
  const rx = /^ {4}([A-Z][A-Z_]+)\((\d)\)/gm
  const out = []
  let m
  while ((m = rx.exec(src)) !== null) out.push({ name: m[1], level: Number(m[2]) })
  return out
}

const BACKEND = {
  WineSweetness: parseEnum('WineSweetness.java'),
  WineBody: parseEnum('WineBody.java'),
  WineIntensity: parseEnum('WineIntensity.java'),
}

describe('백엔드 enum 자체 정합성', () => {
  for (const [name, values] of Object.entries(BACKEND)) {
    test(`${name} 은 1~5 단계를 순서대로 갖는다`, () => {
      assert.equal(values.length, 5, `${name} 값 개수`)
      assert.deepEqual(values.map((v) => v.level), [1, 2, 3, 4, 5], `${name} level 순서`)
    })
  }
})

describe('프론트 척도가 백엔드 enum 과 일치한다', () => {
  const pairs = [
    ['WineSweetness', WINE_SWEETNESS_SCALE],
    ['WineBody', WINE_BODY_SCALE],
    ['WineIntensity', WINE_INTENSITY_SCALE],
  ]
  for (const [enumName, scale] of pairs) {
    test(`${enumName} 값·순서 일치`, () => {
      assert.deepEqual([...scale], BACKEND[enumName].map((v) => v.name))
    })
  }

  test('MAX_LEVEL 이 5 다', () => {
    assert.equal(WINE_TASTE_MAX_LEVEL, 5)
  })

  // 회귀 방지: 척도 파일만 5단계로 바꾸고 spirit.types.ts 의 유니온 타입을 3~4개로
  // 남겨두면, 새 값으로 저장된 와인이 목록 필터에서 누락된다(실제로 발생했던 버그).
  test('spirit.types.ts 유니온 타입도 백엔드 enum 과 일치한다', () => {
    const src = readFileSync(
      join(HERE, '..', 'src', 'domain', 'spirit', 'types', 'spirit.types.ts'),
      'utf8',
    )
    const unions = [
      ['WineSweetness', 'WineSweetness'],
      ['WineBody', 'WineBody'],
      ['WineIntensity', 'WineIntensity'],
    ]
    for (const [tsName, enumName] of unions) {
      const m = new RegExp(`export type ${tsName} =([^\\n]+)`).exec(src)
      assert.ok(m, `${tsName} 유니온 타입을 찾지 못했다`)
      const values = [...m[1].matchAll(/'([A-Z_]+)'/g)].map((x) => x[1])
      assert.deepEqual(
        values,
        BACKEND[enumName].map((v) => v.name),
        `${tsName} 유니온 타입이 백엔드 enum 과 다르다`,
      )
    }
  })
})

describe('tasteLevel', () => {
  test('척도 위치를 1~5 단계로 변환한다', () => {
    assert.equal(tasteLevel(WINE_INTENSITY_SCALE, 'LOW'), 1)
    assert.equal(tasteLevel(WINE_INTENSITY_SCALE, 'MEDIUM'), 3)
    assert.equal(tasteLevel(WINE_INTENSITY_SCALE, 'HIGH'), 5)
    assert.equal(tasteLevel(WINE_SWEETNESS_SCALE, 'MEDIUM_SWEET'), 4)
    assert.equal(tasteLevel(WINE_BODY_SCALE, 'FULL'), 5)
  })

  test('회귀: 3단계 시절 값도 올바른 단계로 해석된다', () => {
    // LOW/MEDIUM/HIGH, LIGHT/MEDIUM/FULL 은 5단계 척도에 그대로 남아 있어야 한다
    for (const legacy of ['LOW', 'MEDIUM', 'HIGH']) {
      assert.ok(tasteLevel(WINE_INTENSITY_SCALE, legacy) > 0, `${legacy} 해석 실패`)
    }
    for (const legacy of ['LIGHT', 'MEDIUM', 'FULL']) {
      assert.ok(tasteLevel(WINE_BODY_SCALE, legacy) > 0, `${legacy} 해석 실패`)
    }
    for (const legacy of ['DRY', 'OFF_DRY', 'MEDIUM', 'SWEET']) {
      assert.ok(tasteLevel(WINE_SWEETNESS_SCALE, legacy) > 0, `${legacy} 해석 실패`)
    }
  })

  test('미지정·알 수 없는 값은 0', () => {
    assert.equal(tasteLevel(WINE_INTENSITY_SCALE, null), 0)
    assert.equal(tasteLevel(WINE_INTENSITY_SCALE, ''), 0)
    assert.equal(tasteLevel(WINE_INTENSITY_SCALE, 'NOPE'), 0)
  })
})

describe('i18n 라벨이 ko/en 양쪽에 모두 있다', () => {
  const ko = JSON.parse(readFileSync(join(LOCALES, 'ko.json'), 'utf8'))
  const en = JSON.parse(readFileSync(join(LOCALES, 'en.json'), 'utf8'))
  const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)

  test('모든 축 라벨 키가 존재한다', () => {
    for (const axis of WINE_TASTE_AXES) {
      for (const [lang, dict] of [['ko', ko], ['en', en]]) {
        assert.ok(get(dict, axis.labelKey), `${lang}: ${axis.labelKey} 누락`)
      }
    }
    for (const [lang, dict] of [['ko', ko], ['en', en]]) {
      assert.ok(get(dict, 'spirit.taste.unset'), `${lang}: spirit.taste.unset 누락`)
      assert.ok(get(dict, 'spirit.taste.title'), `${lang}: spirit.taste.title 누락`)
    }
  })

  test('모든 단계 값 라벨이 존재한다', () => {
    for (const axis of WINE_TASTE_AXES) {
      for (const value of axis.scale) {
        for (const [lang, dict] of [['ko', ko], ['en', en]]) {
          assert.ok(get(dict, `${axis.valueNs}.${value}`), `${lang}: ${axis.valueNs}.${value} 누락`)
        }
      }
    }
  })
})

describe('DB 마이그레이션이 5단계 값을 모두 허용한다', () => {
  const sql = readFileSync(
    join(ENUM_DIR, '..', '..', '..', '..', '..', '..', '..', 'resources', 'db', 'migration',
      'V64__expand_wine_sensory_to_five_levels.sql'),
    'utf8',
  )
  const columns = [
    ['sweetness', WINE_SWEETNESS_SCALE],
    ['body', WINE_BODY_SCALE],
    ['acidity', WINE_INTENSITY_SCALE],
    ['tannin', WINE_INTENSITY_SCALE],
  ]
  for (const [column, scale] of columns) {
    test(`${column} 컬럼 enum 에 5개 값이 모두 있다`, () => {
      const block = sql.slice(sql.indexOf(`COLUMN ${column}`))
      const list = block.slice(block.indexOf('enum('), block.indexOf(')') + 1)
      for (const value of scale) {
        assert.ok(list.includes(`'${value}'`), `${column} 에 ${value} 누락 — 저장 시 오류가 난다`)
      }
    })
  }
})
