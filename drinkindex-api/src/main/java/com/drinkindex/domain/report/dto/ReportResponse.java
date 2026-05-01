package com.drinkindex.domain.report.dto;

import com.drinkindex.domain.report.entity.Report;
import com.drinkindex.domain.report.entity.enums.ReportStatus;
import com.drinkindex.domain.report.entity.enums.ReportTargetType;

import java.time.LocalDateTime;

public record ReportResponse(
        Long id,
        Long reporterId,
        String reporterNickname,
        ReportTargetType targetType,
        Long targetId,
        String reason,
        ReportStatus status,
        String targetContent,
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
