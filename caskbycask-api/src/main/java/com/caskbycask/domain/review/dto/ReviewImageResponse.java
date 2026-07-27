package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.ReviewImage;

public record ReviewImageResponse(
        Long id,
        String imageUrl,
        Integer sortOrder
) {
    public static ReviewImageResponse from(ReviewImage image) {
        return new ReviewImageResponse(image.getId(), image.getImageUrl(), image.getSortOrder());
    }
}
