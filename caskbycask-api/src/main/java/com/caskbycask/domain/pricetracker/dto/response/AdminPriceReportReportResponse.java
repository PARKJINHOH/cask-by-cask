package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.PriceReportReport;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportReportReason;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportReportStatus;

import java.time.LocalDateTime;

public record AdminPriceReportReportResponse(
        Long id,
        Long priceReportId,
        Long reporterId,
        String reporterNickname,
        PriceReportReportReason reason,
        String reasonDetail,
        PriceReportReportStatus status,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt
) {
    public static AdminPriceReportReportResponse from(PriceReportReport report) {
        return new AdminPriceReportReportResponse(
                report.getId(),
                report.getPriceReport().getId(),
                report.getReporter().getId(),
                report.getReporter().getNickname(),
                report.getReason(),
                report.getReasonDetail(),
                report.getStatus(),
                report.getCreatedAt(),
                report.getResolvedAt()
        );
    }
}
