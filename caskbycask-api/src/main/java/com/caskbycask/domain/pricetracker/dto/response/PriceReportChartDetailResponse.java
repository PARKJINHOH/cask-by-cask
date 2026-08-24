package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.pricetracker.entity.PriceDiscountItem;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.PriceReportImage;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PriceReportChartDetailResponse(
        Long reportId,
        Long spiritId,
        Integer volumeMl,
        String storeName,
        String suggestedStoreName,
        BigDecimal finalPrice,
        BigDecimal salePrice,
        BigDecimal regularPrice,
        BigDecimal paybackAmount,
        Boolean isVerified,
        Boolean isAnonymous,
        String reporterNickname,
        String description,
        List<String> publicImageUrls,
        LocalDate purchasedAt,
        List<PriceDiscountItemResponse> discountItems,
        Boolean isHotDeal,
        String sourceSite,
        String sourceUrl,
        // ── 원 통화 병기용. finalPrice/salePrice/regularPrice 는 계속 원화다(하위 호환).
        String currency,
        BigDecimal originalFinalPrice,
        BigDecimal originalRegularPrice,
        BigDecimal exchangeRateSnapshot,
        LocalDate exchangeRateDate
) {
    public static PriceReportChartDetailResponse from(PriceReport report,
                                                      List<PriceReportImage> publicImages,
                                                      List<PriceDiscountItem> discountItems) {
        String nickname = (!report.getIsAnonymous() && report.getReporter() != null)
                ? report.getReporter().getNickname() : null;

        return new PriceReportChartDetailResponse(
                report.getId(),
                report.getSpirit().getId(),
                report.getVolumeMl(),
                report.getStore() != null ? report.getStore().getDisplayName() : null,
                report.getSuggestedStoreName(),
                report.resolveActualPriceKrw(),
                report.convertToKrw(report.getSalePrice()),
                report.convertToKrw(report.getPrice()),
                report.convertToKrw(report.getPaybackAmount()),
                report.getIsVerified(),
                report.getIsAnonymous(),
                nickname,
                report.getDescription(),
                publicImages.stream().map(PriceReportImage::getImageUrl).toList(),
                report.getPurchasedAt(),
                discountItems.stream()
                        .map(item -> PriceDiscountItemResponse.fromKrw(item, report))
                        .toList(),
                false,
                null,
                null,
                report.getCurrency() != null ? report.getCurrency().name() : null,
                report.getActualPrice(),
                report.getPrice(),
                report.getExchangeRateSnapshot(),
                report.getExchangeRateDate()
        );
    }

    public static PriceReportChartDetailResponse from(DealPost d) {
        // 표시 금액은 원화로 통일한다. 외화 딜은 수집 시점 환율로 환산된 값이 들어온다.
        BigDecimal priceVal = d.resolveDealPriceKrw();
        BigDecimal origVal = d.resolveOriginalPriceKrw();
        Integer rawDealPrice = d.getDealPrice();
        Integer rawOrigPrice = d.getOriginalPrice();
        Integer rawFinalPrice = (rawDealPrice != null && rawDealPrice > 0) ? rawDealPrice : rawOrigPrice;
        LocalDate dateVal = d.getCrawledAt() != null ? d.getCrawledAt().toLocalDate() : d.getCreatedAt().toLocalDate();

        return new PriceReportChartDetailResponse(
                d.getId(),
                d.getSpirit() != null ? d.getSpirit().getId() : null,
                d.getVolumeMl(),
                d.getSeller(),
                d.getDrinkName(),
                priceVal,
                priceVal,
                origVal != null ? origVal : priceVal,
                null,
                true,
                true,
                "AI/크롤러",
                d.getSummaryKo(),
                List.of(),
                dateVal,
                List.of(),
                true,
                d.getSourceSite(),
                d.getSourceUrl(),
                d.isKrw() ? "KRW" : d.getCurrency(),
                rawFinalPrice != null ? BigDecimal.valueOf(rawFinalPrice) : null,
                rawOrigPrice != null ? BigDecimal.valueOf(rawOrigPrice) : null,
                d.getExchangeRateSnapshot(),
                d.getExchangeRateDate()
        );
    }
}
