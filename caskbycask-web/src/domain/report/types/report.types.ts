// 백엔드 ReportTargetType 과 짝을 이룬다. 값을 추가하면 AdminReportPage 의
// TARGET_TYPE_LABEL(exhaustive Record)이 컴파일 에러로 알려 준다 — 그게 의도다.
export type ReportTargetType = 'REVIEW' | 'COMMENT' | 'IMAGE' | 'VENUE_COMMENT'

export interface CreateReportRequest {
  targetType: ReportTargetType
  targetId: number
  reason?: string
}
