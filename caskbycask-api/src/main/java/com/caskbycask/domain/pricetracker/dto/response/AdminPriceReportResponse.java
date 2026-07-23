package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.PriceDiscountItem;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.PriceReportImage;
import com.caskbycask.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AdminPriceReportResponse(
        Long id,
        Long spiritId,
        String spiritNameKo,
        Integer volumeMl,
        Long storeId,
        String storeName,
        String suggestedStoreName,
        DutyFreeChannel suggestedDutyfreeChannel,
        StoreType storeType,
        // 구버전 관리자 응답 호환 필드. 매장 마스터 기능 제거 후에는 항상 false.
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
                report.getVolumeMl(),
                report.getStore() != null ? report.getStore().getId() : null,
                report.getStore() != null ? report.getStore().getDisplayName() : null,
                report.getSuggestedStoreName(),
                report.getSuggestedDutyfreeChannel(),
                report.getEffectiveStoreType(),
                // 매장 마스터 표준화 기능은 제거되었으며 직접 입력값을 그대로 승인한다.
                false,
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
