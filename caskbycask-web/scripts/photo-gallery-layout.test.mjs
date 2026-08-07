import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

const { aspectRatioOf, columnCountFor, columnWidthFor, layoutPhotoColumns, DEFAULT_COLUMN_COUNT } =
  await import('../src/domain/photo-gallery/utils/columnLayout.ts')
const { splitPhotoContent } =
  await import('../src/domain/photo-gallery/utils/photoContent.ts')

const sizes = (...pairs) => pairs.map(([width, height]) => ({ width, height }))
const options = (overrides = {}) => ({ columnCount: 3, columnWidth: 400, gap: 8, ...overrides })

describe('이미지 갤러리 컬럼 그리드', () => {
  test('기본은 3분할이다', () => {
    assert.equal(DEFAULT_COLUMN_COUNT, 3)
    assert.equal(columnCountFor(1400), 3)
    assert.equal(columnCountFor(1024), 3)
    assert.equal(columnCountFor(768), 3)
  })

  test('좁은 화면(모바일)은 2분할로 떨어진다', () => {
    assert.equal(columnCountFor(390), 2)
    assert.equal(columnCountFor(639), 2)
    // 폭을 아직 못 잰 상태(0)에서는 기본값을 유지한다.
    assert.equal(columnCountFor(0), 3)
  })

  test('열 폭 = (컨테이너 - 간격) / 열 개수', () => {
    assert.equal(columnWidthFor(1216, 3, 8), 400)
    assert.equal(columnWidthFor(400, 2, 8), 196)
  })

  test('모든 사진이 정확히 한 번씩 배치된다', () => {
    const items = sizes([3, 4], [4, 5], [1, 1], [3, 2], [2, 3], [16, 9], [4, 5], [9, 16])
    const columns = layoutPhotoColumns(items, options())
    const placed = columns.flatMap((column) => column.cells.map((cell) => cell.item))
    assert.equal(placed.length, items.length)
    items.forEach((item) => assert.ok(placed.includes(item)))
  })

  test('열 개수만큼 열이 나온다 (사진이 없어도 구조가 유지된다)', () => {
    assert.equal(layoutPhotoColumns(sizes([3, 4]), options()).length, 3)
    assert.equal(layoutPhotoColumns([], options()).length, 3)
    assert.equal(layoutPhotoColumns([], options({ columnCount: 2 })).length, 2)
  })

  test('각 셀이 원본 비율을 유지한다 (사진이 잘리거나 찌그러지지 않는다)', () => {
    const items = sizes([3, 4], [16, 9], [1, 1], [9, 16], [4, 5], [3, 2])
    const config = options()
    layoutPhotoColumns(items, config).forEach((column) => {
      column.cells.forEach((cell) => {
        const expected = cell.item.width / cell.item.height
        assert.ok(Math.abs(cell.aspectRatio - expected) < 0.001)
        assert.ok(Math.abs(cell.height - config.columnWidth / expected) < 0.001)
      })
    })
  })

  test('열 끝단이 크게 어긋나지 않는다 (가장 짧은 열에 채운다)', () => {
    const items = sizes(
      [3, 4], [16, 9], [1, 1], [9, 16], [4, 5], [3, 2],
      [4, 3], [2, 3], [1, 1], [16, 9], [3, 4], [4, 5],
    )
    const config = options()
    const columns = layoutPhotoColumns(items, config)
    const heights = columns.map((column) => column.height)
    const gap = Math.max(...heights) - Math.min(...heights)
    // 가장 큰 사진 한 장(9:16 → 세로가 가장 김) 높이보다 벌어지면 균형이 깨진 것이다.
    assert.ok(gap < config.columnWidth * (16 / 9), `열 높이 편차가 너무 크다: ${gap}`)
  })

  test('크기를 모르는 이미지는 4:5 로 가정한다', () => {
    assert.equal(aspectRatioOf({ width: 0, height: 0 }), 4 / 5)
    assert.equal(aspectRatioOf({ width: NaN, height: 100 }), 4 / 5)
    assert.equal(aspectRatioOf({ width: -3, height: 4 }), 4 / 5)
    assert.equal(aspectRatioOf({ width: 3, height: 4 }), 3 / 4)
  })

  test('열 개수·폭이 잘못되면 빈 배열이다 (첫 렌더에서 터지지 않게)', () => {
    assert.deepEqual(layoutPhotoColumns(sizes([3, 4]), options({ columnWidth: 0 })), [])
    assert.deepEqual(layoutPhotoColumns(sizes([3, 4]), options({ columnCount: 0 })), [])
  })
})

describe('사진 글 본문 분리', () => {
  test('포토카드 글에서 사진과 캡션을 갈라낸다', () => {
    const html = '<p><img src="https://cdn.test/card.png" alt=""></p><p>오늘의 한 잔</p><p>맛있었다</p>'
    const { imageUrls, captionHtml } = splitPhotoContent(html)
    assert.deepEqual(imageUrls, ['https://cdn.test/card.png'])
    assert.equal(captionHtml, '<p>오늘의 한 잔</p><p>맛있었다</p>')
  })

  test('사진만 있고 캡션이 없으면 캡션은 빈 문자열이다', () => {
    const { imageUrls, captionHtml } = splitPhotoContent('<p><img src="/a.png"></p><p><br></p>')
    assert.deepEqual(imageUrls, ['/a.png'])
    assert.equal(captionHtml, '')
  })

  test('사진이 여러 장이면 등장 순서대로 모은다', () => {
    const html = "<p><img src='/1.png'></p><p>글</p><p><img src=/2.png></p>"
    assert.deepEqual(splitPhotoContent(html).imageUrls, ['/1.png', '/2.png'])
    assert.equal(splitPhotoContent(html).captionHtml, '<p>글</p>')
  })

  test('본문이 없어도 안전하다', () => {
    assert.deepEqual(splitPhotoContent(null), { imageUrls: [], captionHtml: '' })
    assert.deepEqual(splitPhotoContent(''), { imageUrls: [], captionHtml: '' })
    assert.deepEqual(splitPhotoContent('<p>글만 있다</p>'), {
      imageUrls: [],
      captionHtml: '<p>글만 있다</p>',
    })
  })
})
