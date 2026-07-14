package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.PriceDiscountItem;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.PriceReportImage;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PriceReportResponse(
        Long id,
        Long spiritId,
        String spiritNameKo,
        String spiritNameEn,
        Integer volumeMl,
        Long storeId,
        String storeName,
        String suggestedStoreName,
        PriceReportStatus status,
        PriceCurrency currency,
        BigDecimal regularPrice,
        BigDecimal salePrice,
        BigDecimal paybackAmount,
        BigDecimal actualPrice,
        BigDecimal exchangeRateSnapshot,
        LocalDate purchasedAt,
        String description,
        Boolean isAnonymous,
        String reporterNickname,    // isAnonymous=true면 null
        List<PriceReportImageResponse> images,
        List<PriceDiscountItemResponse> discountItems,
        LocalDateTime createdAt
) {
    public static PriceReportResponse from(PriceReport report,
                                           List<PriceReportImage> images,
                                           List<PriceDiscountItem> discountItems) {
        String nickname = (!report.getIsAnonymous() && report.getReporter() != null)
                ? report.getReporter().getNickname() : null;

        return new PriceReportResponse(
                report.getId(),
                report.getSpirit().getId(),
                report.getSpirit().getNameKo(),
                report.getSpirit().getNameEn(),
                report.getVolumeMl(),
                report.getStore() != null ? report.getStore().getId() : null,
                report.getStore() != null ? report.getStore().getDisplayName() : null,
                report.getSuggestedStoreName(),
                report.getStatus(),
                report.getCurrency(),
                report.getPrice(),
                report.getSalePrice(),
                report.getPaybackAmount(),
                report.getActualPrice(),
                report.getExchangeRateSnapshot(),
                report.getPurchasedAt(),
                report.getDescription(),
                report.getIsAnonymous(),
                nickname,
                images.stream().map(PriceReportImageResponse::from).toList(),
                discountItems.stream().map(PriceDiscountItemResponse::from).toList(),
                report.getCreatedAt()
        );
    }
}
