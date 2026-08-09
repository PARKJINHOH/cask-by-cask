package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.ReviewAromaProfileItem;
import com.caskbycask.domain.review.entity.enums.AromaType;

public record AromaProfileItemResponse(
        AromaType aromaType,
        String aromaKey,
        String labelSnapshot,
        Integer intensity
) {
    public static AromaProfileItemResponse from(ReviewAromaProfileItem item) {
        return new AromaProfileItemResponse(
                item.getAromaType(),
                item.getAromaKey(),
                item.getLabelSnapshot(),
                item.getIntensity()
        );
    }
}
