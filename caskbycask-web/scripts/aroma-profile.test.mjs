import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const {
  aromaRefKey,
  aromaRefs,
  buildProfile,
  profileForPhase,
  replacePhaseProfile,
  supportsAromaProfiles,
  syncProfileAfterAromaRemoval,
} = await import('@/domain/review/utils/aroma')

const HERE = dirname(fileURLToPath(import.meta.url))

describe('아로마 프로파일 축 변환', () => {
  test('현재 지원 정책은 위스키에만 프로파일을 연다', () => {
    assert.equal(supportsAromaProfiles('WHISKY'), true)
    assert.equal(supportsAromaProfiles('WINE'), false)
    assert.equal(supportsAromaProfiles(undefined), false)
  })

  test('기존 ID와 자유입력 태그를 순서대로 참조로 만든다', () => {
    assert.deepEqual(aromaRefs({ ids: ['oak'], custom: ['바닐라'] }), [
      { aromaType: 'ID', aromaKey: 'oak', labelSnapshot: 'Oak' },
      { aromaType: 'CUSTOM', aromaKey: '바닐라', labelSnapshot: '바닐라' },
    ])
  })

  test('선택 순서와 강도를 보존해 schemaVersion 1 프로파일을 만든다', () => {
    const refs = aromaRefs({ ids: [], custom: ['바닐라', '후추', '사과'] })
    const intensities = Object.fromEntries(refs.map((ref, index) => [aromaRefKey(ref), index + 1]))
    const profile = buildProfile('NOSE', refs, intensities)
    assert.equal(profile.schemaVersion, 1)
    assert.deepEqual(profile.items.map((item) => item.intensity), [1, 2, 3])
  })
})

describe('프로파일과 태그 동기화', () => {
  const profile = {
    phase: 'NOSE',
    schemaVersion: 1,
    items: ['a', 'b', 'c', 'd'].map((aromaKey, index) => ({
      aromaType: 'CUSTOM', aromaKey, labelSnapshot: aromaKey, intensity: index + 1,
    })),
  }

  test('4개 축에서 포함 태그 하나를 제거하면 나머지 3개를 유지한다', () => {
    const next = syncProfileAfterAromaRemoval(profile, { aromaType: 'CUSTOM', aromaKey: 'a' })
    assert.deepEqual(next.items.map((item) => item.aromaKey), ['b', 'c', 'd'])
  })

  test('3개 축에서 포함 태그를 제거하면 프로파일 삭제를 알리는 null을 반환한다', () => {
    const three = { ...profile, items: profile.items.slice(0, 3) }
    assert.equal(syncProfileAfterAromaRemoval(three, { aromaType: 'CUSTOM', aromaKey: 'a' }), null)
  })

  test('구간 교체와 조회 순서는 향, 맛, 피니시다', () => {
    const finish = { ...profile, phase: 'FINISH' }
    const palate = { ...profile, phase: 'PALATE' }
    const profiles = replacePhaseProfile([finish], 'PALATE', palate)
    assert.deepEqual(profiles.map((item) => item.phase), ['PALATE', 'FINISH'])
    assert.equal(profileForPhase(profiles, 'PALATE'), palate)
  })
})

describe('번역 및 API 배선', () => {
  const locales = ['ko', 'en'].map((locale) => JSON.parse(
    readFileSync(join(HERE, '..', 'src', 'locales', `${locale}.json`), 'utf8'),
  ))

  test('ko/en에 프로파일 구간과 강도 번역이 모두 있다', () => {
    for (const locale of locales) {
      assert.deepEqual(Object.keys(locale.review.aromaProfile.phase), ['NOSE', 'PALATE', 'FINISH'])
      assert.equal(Object.keys(locale.review.aromaProfile.intensity).length, 5)
      assert.ok(locale.review.aromaProfile.minimumHelp)
      assert.ok(locale.review.aromaProfile.expand)
      assert.ok(locale.review.aromaProfile.collapse)
    }
  })

  test('요청·응답 타입에 aromaProfiles가 연결되어 있다', () => {
    const types = readFileSync(join(HERE, '..', 'src', 'domain', 'review', 'types', 'review.types.ts'), 'utf8')
    assert.match(types, /interface AromaProfile\b/)
    assert.ok((types.match(/aromaProfiles\??:/g) ?? []).length >= 4)
  })

  test('리뷰 카드가 축소 버튼과 펼침 패널을 연결한다', () => {
    const item = readFileSync(join(HERE, '..', 'src', 'domain', 'review', 'components', 'ReviewItem.tsx'), 'utf8')
    assert.match(item, /AromaProfilePreviewButton/)
    assert.match(item, /ReviewHeaderDivider/)
    assert.match(item, /aria-hidden=\{!profileExpanded\}/)
    assert.match(item, /md:grid-cols-\[minmax\(0,3fr\)_minmax\(0,2fr\)\]/)
    assert.match(item, /AromaProfileChartPanel profiles=\{aromaProfiles\} chartOnly/)
  })
})
