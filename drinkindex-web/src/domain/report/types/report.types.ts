export type ReportTargetType = 'REVIEW' | 'COMMENT' | 'IMAGE'

export interface CreateReportRequest {
  targetType: ReportTargetType
  targetId: number
  reason?: string
}
