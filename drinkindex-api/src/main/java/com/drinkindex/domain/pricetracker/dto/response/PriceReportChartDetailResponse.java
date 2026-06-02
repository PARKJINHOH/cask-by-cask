package com.drinkindex.domain.pricetracker.dto.response;

import com.drinkindex.domain.pricetracker.entity.PriceDiscountItem;
import com.drinkindex.domain.pricetracker.entity.PriceReport;
import com.drinkindex.domain.pricetracker.entity.PriceReportImage;

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
        List<PriceDiscountItemResponse> discountItems
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
                discountItems.stream().map(PriceDiscountItemResponse::from).toList()
        );
    }
}
