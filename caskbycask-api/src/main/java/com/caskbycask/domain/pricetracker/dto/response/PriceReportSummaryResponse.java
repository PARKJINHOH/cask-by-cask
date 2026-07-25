package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PriceReportSummaryResponse(
        Long id,
        Long spiritId,
        String spiritNameKo,
        Integer volumeMl,
        String storeName,
        String suggestedStoreName,
        PriceReportStatus status,
        PriceCurrency currency,
        BigDecimal actualPrice,
        BigDecimal actualPriceKrw,
        LocalDate purchasedAt,
        Boolean isAnonymous,
        LocalDateTime createdAt
) {
    public static PriceReportSummaryResponse from(PriceReport report) {
        return new PriceReportSummaryResponse(
                report.getId(),
                report.getSpirit().getId(),
                report.getSpirit().getNameKo(),
                report.getVolumeMl(),
                report.getStore() != null ? report.getStore().getDisplayName() : null,
                report.getSuggestedStoreName(),
                report.getStatus(),
                report.getCurrency(),
                report.getActualPrice(),
                report.resolveActualPriceKrw(),
                report.getPurchasedAt(),
                report.getIsAnonymous(),
                report.getCreatedAt()
        );
    }
}
