package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.PriceReportImage;

public record PriceReportImageResponse(
        Long id,
        String imageUrl,
        Integer sortOrder,
        Boolean isPublic
) {
    public static PriceReportImageResponse from(PriceReportImage image) {
        return new PriceReportImageResponse(
                image.getId(),
                image.getImageUrl(),
                image.getSortOrder(),
                image.getIsPublic()
        );
    }
}
