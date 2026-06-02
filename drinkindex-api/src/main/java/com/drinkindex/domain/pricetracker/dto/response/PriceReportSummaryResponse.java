package com.drinkindex.domain.pricetracker.dto.response;

import com.drinkindex.domain.pricetracker.entity.PriceReport;
import com.drinkindex.domain.pricetracker.entity.enums.PriceCurrency;
import com.drinkindex.domain.pricetracker.entity.enums.PriceReportStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PriceReportSummaryResponse(
        Long id,
        Long spiritId,
        String spiritNameKo,
        String storeName,
        String suggestedStoreName,
        PriceReportStatus status,
        PriceCurrency currency,
        BigDecimal actualPrice,
        LocalDate purchasedAt,
        Boolean isAnonymous,
        LocalDateTime createdAt
) {
    public static PriceReportSummaryResponse from(PriceReport report) {
        return new PriceReportSummaryResponse(
                report.getId(),
                report.getSpirit().getId(),
                report.getSpirit().getNameKo(),
                report.getStore() != null ? report.getStore().getDisplayName() : null,
                report.getSuggestedStoreName(),
                report.getStatus(),
                report.getCurrency(),
                report.getActualPrice(),
                report.getPurchasedAt(),
                report.getIsAnonymous(),
                report.getCreatedAt()
        );
    }
}
