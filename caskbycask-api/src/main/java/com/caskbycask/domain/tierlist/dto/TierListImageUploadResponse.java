package com.caskbycask.domain.tierlist.dto;

import com.caskbycask.domain.tierlist.entity.TierListImage;

public record TierListImageUploadResponse(
        Long id,
        String imageUrl,
        String savedFileName,
        String mimeType
) {
    public static TierListImageUploadResponse from(TierListImage image) {
        return new TierListImageUploadResponse(
                image.getId(),
                image.getImageUrl(),
                image.getSavedFileName(),
                image.getMimeType()
        );
    }
}
