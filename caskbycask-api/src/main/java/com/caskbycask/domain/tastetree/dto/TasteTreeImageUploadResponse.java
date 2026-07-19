package com.caskbycask.domain.tastetree.dto;

import com.caskbycask.domain.tastetree.entity.TasteTreeImage;

public record TasteTreeImageUploadResponse(
        Long id,
        String imageUrl,
        String savedFileName,
        String mimeType
) {
    public static TasteTreeImageUploadResponse from(TasteTreeImage image) {
        return new TasteTreeImageUploadResponse(
                image.getId(), image.getImageUrl(), image.getSavedFileName(), image.getMimeType());
    }
}
