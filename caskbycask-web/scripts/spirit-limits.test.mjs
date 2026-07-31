/**
 * 주류 수치 허용 범위 정합성 — 프론트 상수와 백엔드 상수가 어긋나지 않는지 고정한다.
 *
 * 한쪽만 바꾸면 "화면에서는 통과했는데 저장 시 400" 또는 그 반대가 발생하고,
 * 등록·수정·등록요청·에디션 DTO 중 하나만 검증이 빠지면 그 경로로 범위 밖 값이 들어온다.
 * (실제로 UpdateSpiritRequest 에 검증이 누락되어 있었다)
 *
 * 실행: npm run test:spirit-limits
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ABV_MIN, ABV_MAX, VOLUME_ML_MIN, VOLUME_ML_MAX, YEAR_MIN, YEAR_MAX,
  suspiciousVolume, suspiciousAbv,
} from '../src/domain/spirit/data/spiritLimits.ts'
import { formatYearMonth } from '../src/shared/utils/yearMonth.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const API_DTO = join(HERE, '..', '..', 'caskbycask-api', 'src', 'main', 'java', 'com',
  'caskbycask', 'domain', 'spirit', 'dto')

const limitsSrc = readFileSync(join(API_DTO, 'SpiritLimits.java'), 'utf8')
const num = (name) => {
  const m = new RegExp(`${name}\\s*=\\s*([0-9_]+)`).exec(limitsSrc)
  assert.ok(m, `SpiritLimits.${name} 을 찾지 못했다`)
  return Number(m[1].replaceAll('_', ''))
}
const str = (name) => {
  const m = new RegExp(`${name}\\s*=\\s*"([^"]+)"`).exec(limitsSrc)
  assert.ok(m, `SpiritLimits.${name} 을 찾지 못했다`)
  return Number(m[1])
}

describe('프론트 상수 ↔ 백엔드 SpiritLimits 일치', () => {
  test('도수 범위', () => {
    assert.equal(str('ABV_MIN'), ABV_MIN)
    assert.equal(str('ABV_MAX'), ABV_MAX)
    assert.equal(ABV_MAX, 100, '도수는 100%를 넘을 수 없다')
  })

  test('용량 범위', () => {
    assert.equal(num('VOLUME_ML_MIN'), VOLUME_ML_MIN)
    assert.equal(num('VOLUME_ML_MAX'), VOLUME_ML_MAX)
    // 30L(Midas) 이 실제 유통되는 가장 큰 포맷 — 그보다 크면 오타를 못 걸러낸다
    assert.ok(VOLUME_ML_MAX <= 30_000, `용량 상한이 비현실적이다: ${VOLUME_ML_MAX}`)
    assert.ok(VOLUME_ML_MAX >= 6_000, '6L(Imperial) 이상은 담을 수 있어야 한다')
  })

  test('연도 범위', () => {
    assert.equal(num('YEAR_MIN'), YEAR_MIN)
    assert.equal(num('YEAR_MAX'), YEAR_MAX)
  })
})

describe('등록·수정·등록요청·에디션 DTO 가 같은 제약을 갖는다', () => {
  const FILES = [
    'CreateSpiritRequest.java',
    'UpdateSpiritRequest.java',
    'SpiritRegisterRequestBody.java',
    'CreateVariantRequest.java',
  ]

  /** 각 DTO 가 검증해야 하는 필드 — 해당 파일에 그 필드가 있으면 제약도 있어야 한다 */
  const RULES = [
    { field: 'BigDecimal abv,', needs: ['DecimalMin', 'DecimalMax'] },
    { field: 'BigDecimal abvMin,', needs: ['DecimalMin', 'DecimalMax'] },
    { field: 'BigDecimal abvMax,', needs: ['DecimalMin', 'DecimalMax'] },
    { field: 'Integer volumeMl,', needs: ['VOLUME_ML_MIN', 'VOLUME_ML_MAX'] },
    { field: 'Integer volumeMlMin,', needs: ['VOLUME_ML_MIN', 'VOLUME_ML_MAX'] },
    { field: 'Integer volumeMlMax', needs: ['VOLUME_ML_MIN', 'VOLUME_ML_MAX'] },
    { field: 'Integer vintageYear,', needs: ['YEAR_MIN', 'YEAR_MAX'] },
  ]

  for (const file of FILES) {
    test(`${file} 의 수치 필드에 제약이 붙어 있다`, () => {
      const src = readFileSync(join(API_DTO, file), 'utf8')
      for (const { field, needs } of RULES) {
        const at = src.indexOf(field)
        if (at < 0) continue // 그 DTO 에 없는 필드는 건너뜀
        // 필드 선언 직전 6줄 안에 애노테이션이 있어야 한다
        const before = src.slice(0, at).split(/\r?\n/).slice(-7).join('\n')
        for (const need of needs) {
          assert.ok(before.includes(need),
            `${file}: '${field.trim()}' 에 ${need} 제약이 없다 — 이 경로로 범위 밖 값이 저장될 수 있다`)
        }
      }
    })
  }

  test('용량 상한이 하드코딩된 100000 으로 남아 있지 않다', () => {
    for (const file of FILES) {
      const src = readFileSync(join(API_DTO, file), 'utf8')
      assert.ok(!/value = 100000/.test(src),
        `${file}: 옛 상한 100000 이 남아 있다 (SpiritLimits.VOLUME_ML_MAX 를 쓸 것)`)
    }
  })
})

describe('연월(YYYY / YYYY-MM) 형식 — 없는 월을 막는다', () => {
  // 실제로 `1993-30` 이 저장된 사고가 있었다. 느슨한 정규식(-\d{2})이 원인이었다.
  const FRONT_RE = /^\d{4}(-(0[1-9]|1[0-2]))?$/

  test('유효한 값은 통과한다', () => {
    for (const ok of ['1993', '2025-01', '2025-09', '2025-10', '2025-12']) {
      assert.ok(FRONT_RE.test(ok), `${ok} 은 통과해야 한다`)
    }
  })

  test('없는 월은 거부한다', () => {
    for (const bad of ['1993-30', '1993-00', '1993-13', '1993-99', '1993-1', '25-01']) {
      assert.ok(!FRONT_RE.test(bad), `${bad} 은 거부해야 한다`)
    }
  })

  test('입력 포맷터가 없는 월을 만들지 않는다', () => {
    assert.equal(formatYearMonth('2025'), '2025')
    assert.equal(formatYearMonth('202505'), '2025-05')
    assert.equal(formatYearMonth('2025-05'), '2025-05')
    // 두 번째 자리가 월을 무효하게 만들면 그 자리를 버린다 (값을 임의로 바꾸지 않는다)
    assert.equal(formatYearMonth('199330'), '1993-3')
    assert.equal(formatYearMonth('199300'), '1993-0')
    assert.equal(formatYearMonth('199313'), '1993-1')
    // 유효한 월은 그대로
    assert.equal(formatYearMonth('199312'), '1993-12')
  })

  test('백엔드 @Pattern 도 월 범위를 검증한다', () => {
    for (const file of ['SpiritCommonDetailRequest.java', 'SpiritRegisterRequestBody.java']) {
      const src = readFileSync(join(API_DTO, file), 'utf8')
      assert.ok(src.includes('(0[1-9]|1[0-2])'),
        `${file}: 연월 @Pattern 이 월 범위를 검증하지 않는다`)
      assert.ok(!/\\\\d\{4\}\(-\\\\d\{2\}\)\?/.test(src),
        `${file}: 느슨한 연월 정규식이 남아 있다`)
    }
  })

  test('보틀 병입 연도도 같은 규칙을 쓴다', () => {
    const src = readFileSync(join(HERE, '..', '..', 'caskbycask-api', 'src', 'main', 'java',
      'com', 'caskbycask', 'domain', 'bottlecollection', 'dto', 'UserBottleRequest.java'), 'utf8')
    assert.ok(src.includes('(0[1-9]|1[0-2])'), 'UserBottleRequest.bottlingYear 형식 검증 누락')
    assert.ok(/@Max\(value = 1_000_000_000L/.test(src), '구매 가격 상한 누락 (integer 오버플로 위험)')
  })
})

describe('오타 힌트 — 저장은 막지 않고 안내만 한다', () => {
  test('실제 겪은 오타를 잡아낸다', () => {
    // 운영 데이터에 등록됐던 값들
    assert.equal(suspiciousVolume(696), 700, '696ml → 700ml (인접 오타)')
    assert.equal(suspiciousVolume(45), 450, '45ml → 450ml (자릿수 누락)')
    // 자릿수 실수 일반형
    assert.equal(suspiciousVolume(70), 700, '70ml → 700ml')
    assert.equal(suspiciousVolume(7500), 750, '7500ml → 750ml')
  })

  test('표준 규격은 힌트를 띄우지 않는다', () => {
    for (const ok of [700, 750, 1000, 500, 200, 50, 30, 720, 640]) {
      assert.equal(suspiciousVolume(ok), null, `${ok}ml 은 정상 규격이다`)
    }
  })

  test('빈값·0 은 힌트를 띄우지 않는다', () => {
    for (const v of ['', null, undefined, 0, 'abc']) {
      assert.equal(suspiciousVolume(v), null)
    }
  })

  test('도수 힌트는 위스키·꼬냑에만 적용된다', () => {
    assert.equal(suspiciousAbv(4.6, 'WHISKY'), true, '4.6% 위스키는 46% 오타 의심')
    assert.equal(suspiciousAbv(4.6, 'COGNAC'), true)
    // 와인·기타는 저도주가 정상이다
    assert.equal(suspiciousAbv(4.6, 'WINE'), false)
    assert.equal(suspiciousAbv(12, 'OTHER'), false)
    // 정상 도수는 힌트 없음
    assert.equal(suspiciousAbv(46, 'WHISKY'), false)
    assert.equal(suspiciousAbv(40, 'COGNAC'), false)
    // 빈값
    assert.equal(suspiciousAbv('', 'WHISKY'), false)
    assert.equal(suspiciousAbv(null, 'WHISKY'), false)
  })
})

describe('카테고리 전환 시 하위 입력 초기화', () => {
  const formSrc = readFileSync(join(HERE, '..', 'src', 'domain', 'admin', 'components',
    'SpiritFormFields.tsx'), 'utf8')

  test('selectCategory 가 에디션·카테고리 상세를 모두 비운다', () => {
    const at = formSrc.indexOf('const selectCategory')
    assert.ok(at > 0, 'selectCategory 를 찾지 못했다')
    const body = formSrc.slice(at, formSrc.indexOf('\n  }', at))
    assert.ok(body.includes('resetCategoryDetails()'),
      'selectCategory 가 하위 입력을 초기화하지 않는다')

    const resetAt = formSrc.indexOf('const resetCategoryDetails')
    const resetBody = formSrc.slice(resetAt, formSrc.indexOf('\n  }', resetAt))
    for (const setter of [
      'setIsVariantSplit(false)', 'setVariants([])', 'setVariantType(',
      'setSeriesIdentifier(', 'setWhiskyDetail(DEFAULT_WHISKY)',
      'setWineDetail(DEFAULT_WINE)', 'setCognacDetail(DEFAULT_COGNAC)',
      'setOtherDetail(DEFAULT_OTHER)',
    ]) {
      assert.ok(resetBody.includes(setter), `초기화 누락: ${setter}`)
    }
  })

  test('하위 에디션 카드는 위스키에서만 렌더된다', () => {
    // 위스키에서 배치 분리를 켠 뒤 꼬냑으로 바꾸면 에디션 목록이 남아 보이던 문제
    assert.ok(formSrc.includes('{isWhisky && form.isVariantSplit && ('),
      '에디션 카드 조건에 카테고리 확인이 없다')
    assert.ok(!formSrc.includes('{category && form.isVariantSplit && ('),
      '카테고리 무관 조건이 남아 있다')
  })
})
