package com.drinkindex.domain.report.dto;

import com.drinkindex.domain.report.entity.Report;
import com.drinkindex.domain.report.entity.enums.ReportStatus;
import com.drinkindex.domain.report.entity.enums.ReportTargetType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

public record ReportResponse(
        @Schema(description = "신고 고유 ID")
        Long id,
        @Schema(description = "신고자 사용자 ID")
        Long reporterId,
        @Schema(description = "신고자 닉네임")
        String reporterNickname,
        @Schema(description = "신고 대상 유형 (REVIEW, COMMENT, IMAGE)")
        ReportTargetType targetType,
        @Schema(description = "신고 대상 고유 ID")
        Long targetId,
        @Schema(description = "신고 사유")
        String reason,
        @Schema(description = "처리 상태 (PENDING, RESOLVED, DISMISSED)")
        ReportStatus status,
        @Schema(description = "신고 대상 내용 (미리보기)")
        String targetContent,
        @Schema(description = "신고 일시")
        LocalDateTime createdAt
) {
    public static ReportResponse of(Report report, String targetContent) {
        return new ReportResponse(
                report.getId(),
                report.getReporter().getId(),
                report.getReporter().getNickname(),
                report.getTargetType(),
                report.getTargetId(),
                report.getReason(),
                report.getStatus(),
                targetContent,
                report.getCreatedAt()
        );
    }
}
