package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.PriceDiscountItem;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.PriceReportImage;
import com.caskbycask.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;

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
        // [패치 10] 매장 확정(매핑/승인) 필요 여부 — 관리자 가격 승인 화면에서 매장 처리 UI 노출용
        Boolean needsStoreResolution,
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
                // [패치 10] 매장이 없거나 미승인이면 관리자 확정 필요
                report.getStore() == null || Boolean.FALSE.equals(report.getStore().getIsApproved()),
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
