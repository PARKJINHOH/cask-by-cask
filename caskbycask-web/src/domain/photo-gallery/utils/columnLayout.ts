/**
 * 컬럼(세로 열) 그리드 계산 — 기본 3분할로 사진을 크게 보여 준다.
 *
 * 열 폭이 고정이므로 사진 한 장이 차지하는 폭이 커진다(1400px 기준 한 장 ≈ 460px).
 * 자르지 않고 원본 비율 그대로 두려면 높이가 제각각이 되므로, 각 사진을 그때그때
 * **가장 짧은 열**에 넣어 열 끝단이 크게 어긋나지 않게 한다(메이슨리 방식).
 *
 * 순수 함수라 DOM 없이 단위 테스트할 수 있다.
 */

export interface ColumnLayoutItem {
  /** 원본 가로/세로. 알 수 없으면 호출 측에서 기본 비율을 넣는다. */
  width: number
  height: number
}

export interface ColumnLayoutCell<T> {
  item: T
  /** 가로/세로 비율 — 렌더링에서 CSS aspect-ratio 로 그대로 쓴다. */
  aspectRatio: number
  /** 열 폭에 맞췄을 때의 높이(px) */
  height: number
}

export interface PhotoColumn<T> {
  cells: ColumnLayoutCell<T>[]
  /** 열 안 사진 높이 + 간격의 합(px) */
  height: number
}

export interface ColumnLayoutOptions {
  /** 열 개수 */
  columnCount: number
  /** 한 열의 폭(px) */
  columnWidth: number
  /** 사진 사이 세로 간격(px) — 열 높이 비교에 포함해야 균형이 맞는다 */
  gap: number
}

/** 기본 분할 수 — 데스크톱/태블릿에서 사진이 가장 크게 보이는 값 */
export const DEFAULT_COLUMN_COUNT = 3
/** 3분할이 너무 좁아지는 폭(px) — 이 아래로는 2분할로 떨어뜨린다 */
const NARROW_BREAKPOINT = 640

const DEFAULT_ASPECT = 4 / 5

/** 크기를 모르는 이미지의 기본 비율. 갤러리는 4:5(인스타 권장)가 가장 흔하다. */
export const aspectRatioOf = (item: ColumnLayoutItem): number => {
  if (!Number.isFinite(item.width) || !Number.isFinite(item.height)) return DEFAULT_ASPECT
  if (item.width <= 0 || item.height <= 0) return DEFAULT_ASPECT
  return item.width / item.height
}

/** 컨테이너 폭에 따른 열 개수 — 기본 3분할, 좁은 화면(모바일)만 2분할. */
export const columnCountFor = (containerWidth: number): number =>
  containerWidth > 0 && containerWidth < NARROW_BREAKPOINT ? 2 : DEFAULT_COLUMN_COUNT

/** 컨테이너 폭을 열 개수로 나눈 실제 열 폭(px). */
export const columnWidthFor = (containerWidth: number, columnCount: number, gap: number): number =>
  (containerWidth - gap * (columnCount - 1)) / columnCount

export const layoutPhotoColumns = <T extends ColumnLayoutItem>(
  items: T[],
  options: ColumnLayoutOptions,
): PhotoColumn<T>[] => {
  const { columnCount, columnWidth, gap } = options
  if (!Number.isFinite(columnCount) || columnCount < 1) return []
  if (!Number.isFinite(columnWidth) || columnWidth <= 0) return []

  const columns: PhotoColumn<T>[] = Array.from({ length: Math.floor(columnCount) }, () => ({
    cells: [],
    height: 0,
  }))

  for (const item of items) {
    const aspectRatio = aspectRatioOf(item)
    const height = columnWidth / aspectRatio
    // 가장 짧은 열에 넣는다. 높이가 같으면 왼쪽부터 — 최신 사진이 왼쪽 위에 오도록.
    let target = columns[0]
    for (const column of columns) {
      if (column.height < target.height) target = column
    }
    target.cells.push({ item, aspectRatio, height })
    target.height += height + (target.cells.length > 1 ? gap : 0)
  }

  return columns
}
