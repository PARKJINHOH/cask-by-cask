package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.SpiritImage;

public record SpiritImageResponse(
        Long id,
        String imageUrl,
        Boolean isPrimary,
        Integer sortOrder
) {
    public static SpiritImageResponse from(SpiritImage image) {
        return new SpiritImageResponse(
                image.getId(),
                image.getImageUrl(),
                image.getIsPrimary(),
                image.getSortOrder()
        );
    }
}
