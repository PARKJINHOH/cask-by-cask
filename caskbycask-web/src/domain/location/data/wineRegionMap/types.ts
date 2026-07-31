/**
 * 산지 지도 기하 데이터 타입.
 *
 * 좌표는 이미 viewBox 좌표계로 투영·단순화되어 있다 — 런타임에 지리 라이브러리가 필요 없고
 * 서버에서 그대로 렌더되므로 SSR 에 안전하다. 데이터는 `npm run map:build` 로 생성한다.
 */

export interface RegionShape {
  /** 투영·단순화된 SVG path (여러 서브패스 가능 — 섬·분리 구역) */
  path: string
  /** 핀·라벨을 놓을 viewBox 좌표 (도형 내부에서 경계로부터 가장 먼 지점) */
  marker: [number, number]
  /**
   * viewBox 좌표계에서의 경계 상자 `[minX, minY, maxX, maxY]`.
   *
   * 확대 지도에서 대상 구역을 중심으로 viewBox 를 다시 계산하는 데 쓴다 —
   * 캘리포니아처럼 형제 산지가 넓게 퍼진 경우 합집합에 맞추면 대상(나파밸리)이
   * 점처럼 작아지므로, 같은 베이킹 데이터에서 대상 중심 확대를 만들어낸다.
   */
  bbox: [number, number, number, number]
  /** 라벨 겹침 회피용 오프셋 — 생성 후 수동 보정이 필요한 경우에만 사용 */
  labelDx?: number
  labelDy?: number
  labelAlign?: 'start' | 'middle' | 'end'
}

/** L1 하위 확대 지도 */
export interface ZoomMap {
  /** 확대 범위에서의 L1 전체 실루엣 (문맥용) */
  outlinePath: string
  /** L2 세부산지 — 코드는 백엔드 WineRegion enum 과 일치해야 한다 */
  regions: Record<string, RegionShape>
}

export interface CountryMap {
  /** ISO 3166-1 alpha-2 */
  countryCode: string
  /** 지도 카드 하단에 표시할 경계 데이터 출처 (라이선스 요구사항) */
  attribution: string
  viewBox: string
  /** 국토 실루엣 */
  outlinePath: string
  /** L1 대산지 */
  regions: Record<string, RegionShape>
  /** L1 코드 → 확대 지도. 없는 L1 은 확대 패널을 생략한다 */
  zooms: Record<string, ZoomMap>
}
