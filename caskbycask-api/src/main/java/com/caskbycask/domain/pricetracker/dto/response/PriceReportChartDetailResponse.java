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
        String sourceUrl
) {
    public static PriceReportChartDetailResponse from(PriceReport report,
                                                      List<PriceReportImage> publicImages,
                                                      List<PriceDiscountItem> discountItems) {
        String nickname = (!report.getIsAnonymous() && report.getReporter() != null)
                ? report.getReporter().getNickname() : null;

        return new PriceReportChartDetailResponse(
                report.getId(),
                report.getStore() != null ? report.getStore().getDisplayName() : null,
                report.getSuggestedStoreName(),
                report.getActualPrice(),
                report.getSalePrice(),
                report.getPrice(),
                report.getPaybackAmount(),
                report.getIsVerified(),
                report.getIsAnonymous(),
                nickname,
                report.getDescription(),
                publicImages.stream().map(PriceReportImage::getImageUrl).toList(),
                report.getPurchasedAt(),
                discountItems.stream().map(PriceDiscountItemResponse::from).toList(),
                false,
                null,
                null
        );
    }

    public static PriceReportChartDetailResponse from(DealPost d) {
        BigDecimal priceVal = d.getDealPrice() != null ? BigDecimal.valueOf(d.getDealPrice()) : null;
        BigDecimal origVal = d.getOriginalPrice() != null ? BigDecimal.valueOf(d.getOriginalPrice()) : null;
        LocalDate dateVal = d.getCrawledAt() != null ? d.getCrawledAt().toLocalDate() : d.getCreatedAt().toLocalDate();

        return new PriceReportChartDetailResponse(
                d.getId(),
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
                d.getSourceUrl()
        );
    }
}
