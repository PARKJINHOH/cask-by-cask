import { test } from 'node:test'
import assert from 'node:assert/strict'

const { findLastDisplayedVariant, compareVariantDisplayOrder } = await import(
  '@/domain/spirit/utils/variantDisplayOrder'
)

test('등록 시각과 무관하게 표시 순서의 마지막 에디션을 고른다', () => {
  const variants = [
    { id: 30, displayOrder: 99, createdAt: '2026-08-20T10:00:00' },
    { id: 10, displayOrder: 0, createdAt: '2026-08-21T10:00:00' },
  ]

  assert.equal(findLastDisplayedVariant(variants)?.id, 30)
})

test('표시 순서가 없는 에디션은 목록 맨 뒤로 취급한다', () => {
  const variants = [
    { id: 10, displayOrder: 0 },
    { id: 11, displayOrder: null },
    { id: 12, displayOrder: 5 },
  ]

  assert.equal(findLastDisplayedVariant(variants)?.id, 11)
})

test('표시 순서가 같으면 더 큰 ID를 고른다', () => {
  const variants = [
    { id: 41, displayOrder: 3 },
    { id: 42, displayOrder: 3 },
  ]

  assert.equal(findLastDisplayedVariant(variants)?.id, 42)
})

test('에디션이 없으면 기본 표시 대상을 만들지 않는다', () => {
  assert.equal(findLastDisplayedVariant([]), null)
})

test('비교자는 목록 정렬(표시 순서 오름차순, 미지정은 맨 뒤)에 그대로 쓰인다', () => {
  const sorted = [
    { id: 12, displayOrder: 5 },
    { id: 11, displayOrder: null },
    { id: 10, displayOrder: 0 },
  ].sort(compareVariantDisplayOrder)

  assert.deepEqual(sorted.map((v) => v.id), [10, 12, 11])
})
