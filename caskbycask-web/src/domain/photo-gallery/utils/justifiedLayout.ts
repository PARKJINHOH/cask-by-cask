/**
 * justified 그리드 계산 — 사진 비율대로 행을 꽉 채우는 배치(Flickr·구글 포토 방식).
 *
 * 인스타처럼 정사각으로 잘라 버리면 세로 사진이 상하로 잘려 구도가 망가진다.
 * 사진마다 비율을 지키면서 행 오른쪽 끝을 맞추려면 행 높이를 매번 다시 구해야 한다.
 *
 * 알고리즘: 목표 행 높이 H 로 가정하고 종횡비(ar = w/h)를 누적하다가
 * 폭이 컨테이너를 넘는 순간 행을 끊고, 실제 행 높이를 h = (W - gap*(n-1)) / Σar 로 되돌려 계산한다.
 * 마지막 행은 채울 수 없으므로 H 를 그대로 두고 왼쪽 정렬한다.
 *
 * 순수 함수라 DOM 없이 단위 테스트할 수 있다.
 */

export interface JustifiedItem {
  /** 원본 가로/세로. 알 수 없으면 호출 측에서 기본 비율을 넣는다. */
  width: number
  height: number
}

export interface JustifiedCell<T> {
  item: T
  width: number
  height: number
}

export interface JustifiedRow<T> {
  cells: JustifiedCell<T>[]
  height: number
  /** 마지막 행처럼 컨테이너를 다 채우지 못한 행 */
  partial: boolean
}

export interface JustifiedOptions {
  /** 컨테이너 폭(px) */
  containerWidth: number
  /** 목표 행 높이(px) */
  targetRowHeight: number
  /** 사진 사이 간격(px) */
  gap: number
  /** 행 높이가 목표의 몇 배까지 늘어나도 되는지 — 한 장만 남은 행이 거대해지는 것을 막는다 */
  maxRowHeightRatio?: number
}

const DEFAULT_ASPECT = 4 / 5

/** 크기를 모르는 이미지의 기본 비율. 갤러리는 4:5(인스타 권장)가 가장 흔하다. */
export const aspectRatioOf = (item: JustifiedItem): number => {
  if (!Number.isFinite(item.width) || !Number.isFinite(item.height)) return DEFAULT_ASPECT
  if (item.width <= 0 || item.height <= 0) return DEFAULT_ASPECT
  return item.width / item.height
}

export const layoutJustifiedRows = <T extends JustifiedItem>(
  items: T[],
  options: JustifiedOptions,
): JustifiedRow<T>[] => {
  const { containerWidth, targetRowHeight, gap } = options
  const maxRowHeight = targetRowHeight * (options.maxRowHeightRatio ?? 1.6)
  if (containerWidth <= 0 || targetRowHeight <= 0 || items.length === 0) return []

  const rows: JustifiedRow<T>[] = []
  let current: { item: T; ar: number }[] = []
  let aspectSum = 0

  const pushRow = (partial: boolean) => {
    if (current.length === 0) return
    const gaps = gap * (current.length - 1)
    const height = partial
      ? Math.min(targetRowHeight, maxRowHeight)
      : Math.min((containerWidth - gaps) / aspectSum, maxRowHeight)
    rows.push({
      cells: current.map(({ item, ar }) => ({
        item,
        width: ar * height,
        height,
      })),
      height,
      partial,
    })
    current = []
    aspectSum = 0
  }

  for (const item of items) {
    const ar = aspectRatioOf(item)
    current.push({ item, ar })
    aspectSum += ar
    if (aspectSum * targetRowHeight + gap * (current.length - 1) >= containerWidth) {
      pushRow(false)
    }
  }
  pushRow(true)

  return rows
}
