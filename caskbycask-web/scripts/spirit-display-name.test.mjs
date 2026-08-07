import { test } from 'node:test'
import assert from 'node:assert/strict'

const { getLocalizedNames, getLocalizedSpiritListNames } = await import(
  '@/domain/spirit/utils/spiritDisplayName'
)

test('국문명이 비어 있으면 한국어 화면에서도 영문명만 표시한다', () => {
  assert.deepEqual(getLocalizedNames('', 'Chateau Test', 'ko'), {
    primaryName: 'Chateau Test',
    secondaryName: null,
  })
})

test('수집 임시값처럼 국문명과 영문명이 같으면 중복 부제목을 숨긴다', () => {
  assert.deepEqual(getLocalizedNames('Chateau Test', 'Chateau Test', 'ko'), {
    primaryName: 'Chateau Test',
    secondaryName: null,
  })
})

test('수집 임시값의 빈티지 목록도 영문 시리즈명 하나만 표시한다', () => {
  const names = getLocalizedSpiritListNames({
    nameKo: 'Chateau Test',
    nameEn: 'Chateau Test',
    category: 'WINE',
    parentId: 1,
    vintageYear: 2020,
    seriesIdentifier: '빈티지',
    seriesIdentifierEn: 'Vintage',
    variantValue: '2020',
    variantValueEn: '2020',
  }, 'ko')
  assert.equal(names.primaryName, 'Chateau Test Vintage 2020')
  assert.equal(names.secondaryName, null)
})

test('관리자가 국문명을 입력하면 언어별 주제목과 부제목을 교차 표시한다', () => {
  const spirit = {
    nameKo: '샤토 테스트',
    nameEn: 'Chateau Test',
    category: 'WINE',
    vintageYear: 2020,
    parentId: 1,
    variantValue: '2020',
    variantValueEn: '2020',
  }
  const names = getLocalizedSpiritListNames(spirit, 'ko')
  assert.equal(names.primaryName, '샤토 테스트 2020')
  assert.equal(names.secondaryName, 'Chateau Test 2020')
})
