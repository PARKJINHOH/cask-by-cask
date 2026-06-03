package com.drinkindex.domain.pricetracker.dto.response;

import com.drinkindex.domain.pricetracker.entity.PriceDiscountItem;
import com.drinkindex.domain.pricetracker.entity.PriceReport;
import com.drinkindex.domain.pricetracker.entity.PriceReportImage;
import com.drinkindex.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.drinkindex.domain.pricetracker.entity.enums.PriceCurrency;
import com.drinkindex.domain.pricetracker.entity.enums.PriceReportStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AdminPriceReportResponse(
        Long id,
        Long spiritId,
        String spiritNameKo,
        Long storeId,
        String storeName,
        String suggestedStoreName,
        DutyFreeChannel suggestedDutyfreeChannel,
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
        Long reporterId,
        String reporterNickname,
        Boolean autoFlagged,
        Integer reportCount,
        String rejectReason,
        List<PriceReportImageResponse> images,
        List<PriceDiscountItemResponse> discountItems,
        LocalDateTime createdAt,
        LocalDateTime approvedAt
) {
    public static AdminPriceReportResponse from(PriceReport report,
                                                List<PriceReportImage> images,
                                                List<PriceDiscountItem> discountItems) {
        return new AdminPriceReportResponse(
                report.getId(),
                report.getSpirit().getId(),
                report.getSpirit().getNameKo(),
                report.getStore() != null ? report.getStore().getId() : null,
                report.getStore() != null ? report.getStore().getDisplayName() : null,
                report.getSuggestedStoreName(),
                report.getSuggestedDutyfreeChannel(),
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
                report.getReporter() != null ? report.getReporter().getId() : null,
                report.getReporter() != null ? report.getReporter().getNickname() : null,
                report.getAutoFlagged(),
                report.getReportCount(),
                report.getRejectReason(),
                images.stream().map(PriceReportImageResponse::from).toList(),
                discountItems.stream().map(PriceDiscountItemResponse::from).toList(),
                report.getCreatedAt(),
                report.getApprovedAt()
        );
    }
}
