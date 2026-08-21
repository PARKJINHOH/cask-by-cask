import { test } from 'node:test'
import assert from 'node:assert/strict'

const { findLatestRegisteredVariant } = await import(
  '@/domain/spirit/utils/latestSpiritVariant'
)

test('표시 순서와 무관하게 가장 나중에 등록된 에디션을 고른다', () => {
  const variants = [
    { id: 30, displayOrder: 0, createdAt: '2026-08-20T10:00:00' },
    { id: 10, displayOrder: 99, createdAt: '2026-08-21T10:00:00' },
  ]

  assert.equal(findLatestRegisteredVariant(variants)?.id, 10)
})

test('등록 시각이 같으면 나중에 생성된 더 큰 ID를 고른다', () => {
  const variants = [
    { id: 41, createdAt: '2026-08-21T10:00:00' },
    { id: 42, createdAt: '2026-08-21T10:00:00' },
  ]

  assert.equal(findLatestRegisteredVariant(variants)?.id, 42)
})

test('에디션이 없으면 기본 표시 대상을 만들지 않는다', () => {
  assert.equal(findLatestRegisteredVariant([]), null)
})
