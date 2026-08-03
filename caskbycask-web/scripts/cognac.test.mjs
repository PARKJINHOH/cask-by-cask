/**
 * 꼬냑 등급·크뤼·오크 목록 검증.
 *
 * 값의 단일 소스는 백엔드 enum(`CognacGrade`·`CognacCru`·`CognacOakType`)이고
 * 프론트는 등록 폼·상세 표시·목록 필터 세 곳에서 같은 값을 재선언한다.
 * 한 곳만 빠지면 등록은 되는데 표시가 안 되거나(라벨 누락) 필터에서 누락되므로 여기서 고정한다.
 *
 * 실행: npm run test:cognac
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const API_SRC = join(HERE, '..', '..', 'caskbycask-api', 'src', 'main')
const ENUM_DIR = join(API_SRC, 'java', 'com', 'caskbycask', 'domain', 'spirit', 'entity', 'enums')
const MIGRATION_DIR = join(API_SRC, 'resources', 'db', 'migration')
const LOCALES = join(HERE, '..', 'src', 'locales')
const WEB_SRC = join(HERE, '..', 'src')

const { COGNAC_GRADES, COGNAC_CRUS, COGNAC_OAK_TYPES, COGNAC_GRADE_MIN_YEARS, isSingleCru } =
  await import('@/domain/spirit/data/cognac')

/** Java enum 의 값 이름을 선언 순서대로 뽑는다 (주석·javadoc 무시) */
function parseEnum(file) {
  const src = readFileSync(join(ENUM_DIR, file), 'utf8')
  const body = src.slice(src.indexOf('{') + 1, src.lastIndexOf('}'))
  const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  return [...withoutComments.matchAll(/^\s*([A-Z][A-Z_]*)\s*[,;]?\s*$/gm)].map((m) => m[1])
}

const BACKEND = {
  CognacGrade: parseEnum('CognacGrade.java'),
  CognacCru: parseEnum('CognacCru.java'),
  CognacOakType: parseEnum('CognacOakType.java'),
}

describe('프론트 목록이 백엔드 enum 과 같은 값 집합을 갖는다', () => {
  const pairs = [
    ['CognacGrade', COGNAC_GRADES],
    ['CognacCru', COGNAC_CRUS],
    ['CognacOakType', COGNAC_OAK_TYPES],
  ]
  for (const [enumName, list] of pairs) {
    test(`${enumName} 값 집합 일치`, () => {
      // 순서는 프론트가 표시 순(숙성 위계·사용 빈도)을 따로 정하므로 집합만 비교한다
      assert.deepEqual([...list].sort(), [...BACKEND[enumName]].sort())
    })
  }

  test('크뤼는 꼬냑 AOC 법정 6개 구역이다', () => {
    assert.equal(COGNAC_CRUS.length, 6)
  })
})

describe('spirit.types.ts 유니온 타입도 백엔드 enum 과 일치한다', () => {
  const src = readFileSync(join(WEB_SRC, 'domain', 'spirit', 'types', 'spirit.types.ts'), 'utf8')

  for (const [tsName, enumName] of [
    ['CognacGrade', 'CognacGrade'],
    ['CognacCru', 'CognacCru'],
    ['CognacOakType', 'CognacOakType'],
  ]) {
    test(`${tsName} 유니온 타입`, () => {
      // 유니온이 여러 줄에 걸칠 수 있어 다음 `export` 까지를 본다
      const start = src.indexOf(`export type ${tsName} =`)
      assert.ok(start >= 0, `${tsName} 유니온 타입을 찾지 못했다`)
      const rest = src.slice(start + `export type ${tsName} =`.length)
      const end = rest.indexOf('export ')
      const block = end < 0 ? rest : rest.slice(0, end)
      const values = [...block.matchAll(/'([A-Z_]+)'/g)].map((x) => x[1])
      assert.deepEqual([...values].sort(), [...BACKEND[enumName]].sort())
    })
  }
})

describe('목록 필터가 모든 등급을 노출한다', () => {
  // 등급이 필터 배열에서 빠지면 그 등급으로 등록된 꼬냑이 검색에서 누락된다
  test('CategoryTree 의 COGNAC_GRADES', () => {
    const src = readFileSync(
      join(WEB_SRC, 'domain', 'spirit', 'components', 'filter', 'CategoryTree.tsx'), 'utf8')
    const m = /const COGNAC_GRADES: CognacGrade\[\] = \[([^\]]+)\]/.exec(src)
    assert.ok(m, 'CategoryTree 의 COGNAC_GRADES 를 찾지 못했다')
    const values = [...m[1].matchAll(/'([A-Z_]+)'/g)].map((x) => x[1])
    assert.deepEqual([...values].sort(), [...BACKEND.CognacGrade].sort())
  })
})

describe('i18n 라벨이 ko/en 양쪽에 모두 있다', () => {
  const ko = JSON.parse(readFileSync(join(LOCALES, 'ko.json'), 'utf8'))
  const en = JSON.parse(readFileSync(join(LOCALES, 'en.json'), 'utf8'))
  const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)

  const groups = [
    ['spirit.cognacGrade', COGNAC_GRADES],
    ['spirit.cognacCru', COGNAC_CRUS],
    ['spirit.cognacOak', COGNAC_OAK_TYPES],
  ]
  for (const [ns, values] of groups) {
    test(`${ns} 라벨`, () => {
      for (const value of values) {
        for (const [lang, dict] of [['ko', ko], ['en', en]]) {
          assert.ok(get(dict, `${ns}.${value}`), `${lang}: ${ns}.${value} 누락`)
        }
      }
    })
  }

  test('싱글 크뤼 / 멀티 크뤼 블렌드 라벨', () => {
    for (const key of ['spirit.cognacBlend.singleCru', 'spirit.cognacBlend.multiCru']) {
      for (const [lang, dict] of [['ko', ko], ['en', en]]) {
        assert.ok(get(dict, key), `${lang}: ${key} 누락`)
      }
    }
  })
})

describe('DB 마이그레이션이 모든 등급·크뤼를 허용한다', () => {
  // grade/cru 는 실제 DB enum 컬럼이라 마이그레이션이 빠지면 저장 시 오류가 난다.
  // (oakType 은 extra_data JSON 이라 컬럼 제약이 없다)
  //
  // 값을 추가할 때마다 새 마이그레이션이 생기므로 파일명을 고정하지 않고
  // **그 컬럼을 마지막으로 MODIFY 한 마이그레이션**(=현재 스키마)을 찾아서 본다.
  const latestEnumColumn = (column) => {
    const marker = `MODIFY ${column}`
    const files = readdirSync(MIGRATION_DIR)
      .filter((f) => f.endsWith('.sql'))
      .filter((f) => readFileSync(join(MIGRATION_DIR, f), 'utf8').includes(marker))
      .sort((a, b) => Number(a.match(/^V(\d+)/)[1]) - Number(b.match(/^V(\d+)/)[1]))
    assert.ok(files.length > 0, `${column} 을 MODIFY 하는 마이그레이션이 없다`)

    const file = files[files.length - 1]
    const sql = readFileSync(join(MIGRATION_DIR, file), 'utf8')
    const block = sql.slice(sql.indexOf(marker))
    return { file, list: block.slice(block.indexOf('enum'), block.indexOf(')') + 1) }
  }

  test('grade 컬럼에 모든 등급이 있다', () => {
    const { file, list } = latestEnumColumn('grade')
    for (const value of COGNAC_GRADES) {
      assert.ok(list.includes(`'${value}'`), `${file} 의 grade 에 ${value} 누락 — 저장 시 오류가 난다`)
    }
  })

  test('cru 컬럼에 법정 6개 구역이 모두 있다', () => {
    const { file, list } = latestEnumColumn('cru')
    for (const value of COGNAC_CRUS) {
      assert.ok(list.includes(`'${value}'`), `${file} 의 cru 에 ${value} 누락 — 저장 시 오류가 난다`)
    }
  })

  // Hibernate 가 생성하는 enum 순서는 알파벳순이라 ddl-auto=validate 를 통과하려면
  // 마이그레이션의 나열 순서도 알파벳순이어야 한다 (V64·V65 주석에 명시된 규칙)
  test('마이그레이션 enum 나열이 알파벳순이다', () => {
    for (const column of ['grade', 'cru']) {
      const { file, list } = latestEnumColumn(column)
      const values = [...list.matchAll(/'([A-Z_]+)'/g)].map((x) => x[1])
      assert.deepEqual(values, [...values].sort(), `${file} 의 ${column} 나열이 알파벳순이 아니다`)
    }
  })
})

describe('등급 힌트', () => {
  // 법정 최소 숙성연수가 없는 두 값 — 힌트를 붙이면 없는 기준을 있는 것처럼 보여준다
  const NO_YEAR_HINT = ['EXTRA', 'NO_STATEMENT']

  for (const grade of NO_YEAR_HINT) {
    test(`${grade} 는 법정 최소 숙성연수가 없어 힌트를 두지 않는다`, () => {
      assert.equal(COGNAC_GRADE_MIN_YEARS[grade], undefined)
    })
  }

  test('나머지 등급은 모두 힌트를 갖는다', () => {
    for (const grade of COGNAC_GRADES.filter((g) => !NO_YEAR_HINT.includes(g))) {
      assert.ok(COGNAC_GRADE_MIN_YEARS[grade], `${grade} 힌트 누락`)
    }
  })

  test("'등급 표기 없음'은 숙성 위계의 맨 뒤에 둔다", () => {
    // 위계 밖의 값이라 VS~Hors d'Age 사이에 끼면 등급 순서가 잘못 읽힌다
    assert.equal(COGNAC_GRADES[COGNAC_GRADES.length - 1], 'NO_STATEMENT')
  })
})

describe('isSingleCru — 블렌드는 크뤼 개수에서 파생한다', () => {
  test('1개면 싱글 크뤼', () => {
    assert.equal(isSingleCru([{ cru: 'GRANDE_CHAMPAGNE' }]), true)
  })

  test('2개 이상이면 블렌드', () => {
    assert.equal(isSingleCru([{ cru: 'GRANDE_CHAMPAGNE' }, { cru: 'BORDERIES' }]), false)
  })

  test('구성이 없으면 싱글 크뤼가 아니다', () => {
    assert.equal(isSingleCru([]), false)
    assert.equal(isSingleCru(null), false)
    assert.equal(isSingleCru(undefined), false)
  })
})
