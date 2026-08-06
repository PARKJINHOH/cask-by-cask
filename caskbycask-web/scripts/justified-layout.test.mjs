import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

const { aspectRatioOf, layoutJustifiedRows } =
  await import('../src/domain/photo-gallery/utils/justifiedLayout.ts')

const options = (overrides = {}) => ({
  containerWidth: 1200,
  targetRowHeight: 260,
  gap: 6,
  ...overrides,
})

/** 한 행이 컨테이너를 정확히 채우는지 — 오차 0.5px 이내 */
const rowWidth = (row, gap) =>
  row.cells.reduce((sum, cell) => sum + cell.width, 0) + gap * (row.cells.length - 1)

const sizes = (...pairs) => pairs.map(([width, height]) => ({ width, height }))

describe('justified 그리드 계산', () => {
  test('마지막 행을 뺀 모든 행이 컨테이너 폭을 꽉 채운다', () => {
    const items = sizes(
      [3, 4], [4, 5], [1, 1], [3, 2], [2, 3], [16, 9],
      [4, 5], [1, 1], [9, 16], [3, 4], [4, 3], [1, 1],
      [2, 3], [3, 2], [4, 5], [16, 9], [1, 1], [3, 4],
    )
    const config = options()
    const rows = layoutJustifiedRows(items, config)

    assert.ok(rows.length >= 2)
    rows.slice(0, -1).forEach((row, index) => {
      assert.equal(row.partial, false, `행 ${index + 1} 이 부분 행으로 표시됐다`)
      assert.ok(
        Math.abs(rowWidth(row, config.gap) - config.containerWidth) < 0.5,
        `행 ${index + 1} 채움 오차: ${rowWidth(row, config.gap)} vs ${config.containerWidth}`,
      )
    })
  })

  test('모든 사진이 정확히 한 번씩 배치된다', () => {
    const items = sizes([3, 4], [4, 5], [1, 1], [3, 2], [2, 3], [16, 9], [4, 5])
    const rows = layoutJustifiedRows(items, options())
    const placed = rows.flatMap((row) => row.cells.map((cell) => cell.item))
    assert.equal(placed.length, items.length)
    items.forEach((item) => assert.ok(placed.includes(item)))
  })

  test('각 셀이 원본 비율을 유지한다 (사진이 찌그러지지 않는다)', () => {
    const items = sizes([3, 4], [16, 9], [1, 1], [9, 16], [4, 5], [3, 2])
    const rows = layoutJustifiedRows(items, options())
    rows.forEach((row) => {
      row.cells.forEach((cell) => {
        const expected = cell.item.width / cell.item.height
        assert.ok(Math.abs(cell.width / cell.height - expected) < 0.001)
      })
    })
  })

  test('같은 행의 사진은 높이가 같다', () => {
    const rows = layoutJustifiedRows(
      sizes([3, 4], [16, 9], [1, 1], [9, 16], [4, 5], [3, 2], [4, 3]),
      options(),
    )
    rows.forEach((row) => {
      row.cells.forEach((cell) => assert.equal(cell.height, row.height))
    })
  })

  test('마지막 행은 목표 높이를 유지하고 늘어나지 않는다', () => {
    const config = options()
    const rows = layoutJustifiedRows(sizes([3, 4], [4, 5], [1, 1], [1, 1]), config)
    const last = rows[rows.length - 1]
    assert.equal(last.partial, true)
    assert.equal(last.height, config.targetRowHeight)
    assert.ok(rowWidth(last, config.gap) <= config.containerWidth + 0.5)
  })

  test('한 장만 남은 행이 화면을 뒤덮지 않는다 (최대 높이 제한)', () => {
    const config = options({ containerWidth: 1200, targetRowHeight: 260 })
    // 매우 가로로 긴 사진 하나 → 제한이 없으면 행 높이가 목표보다 훨씬 커진다.
    const rows = layoutJustifiedRows(sizes([32, 9]), config)
    assert.ok(rows[0].height <= config.targetRowHeight * 1.6 + 0.001)
  })

  test('크기를 모르는 이미지는 4:5 로 가정한다', () => {
    // 서버가 크기를 모르는(마이그레이션 이전) 이미지도 레이아웃이 비지 않아야 한다.
    assert.equal(aspectRatioOf({ width: 0, height: 0 }), 4 / 5)
    assert.equal(aspectRatioOf({ width: NaN, height: 100 }), 4 / 5)
    assert.equal(aspectRatioOf({ width: -3, height: 4 }), 4 / 5)
    assert.equal(aspectRatioOf({ width: 3, height: 4 }), 3 / 4)
  })

  test('좁은 화면에서도 계산이 성립한다', () => {
    const config = options({ containerWidth: 360, targetRowHeight: 170, gap: 6 })
    const rows = layoutJustifiedRows(sizes([3, 4], [4, 5], [1, 1], [3, 2], [16, 9]), config)
    rows.slice(0, -1).forEach((row) => {
      assert.ok(Math.abs(rowWidth(row, config.gap) - config.containerWidth) < 0.5)
    })
  })

  test('빈 목록이나 폭 0 이면 빈 배열이다 (초기 렌더에서 터지지 않게)', () => {
    assert.deepEqual(layoutJustifiedRows([], options()), [])
    assert.deepEqual(layoutJustifiedRows(sizes([3, 4]), options({ containerWidth: 0 })), [])
    assert.deepEqual(layoutJustifiedRows(sizes([3, 4]), options({ targetRowHeight: 0 })), [])
  })
})
