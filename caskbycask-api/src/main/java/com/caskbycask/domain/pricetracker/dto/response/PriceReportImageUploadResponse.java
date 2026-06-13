package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.PriceReportImage;

public record PriceReportImageUploadResponse(
        Long id,
        String imageUrl,
        String originalFileName
) {
    public static PriceReportImageUploadResponse from(PriceReportImage image) {
        return new PriceReportImageUploadResponse(
                image.getId(),
                image.getImageUrl(),
                image.getOriginalFileName()
        );
    }
}
