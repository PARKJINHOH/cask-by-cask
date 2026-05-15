package com.drinkindex.domain.popup.dto;

import com.drinkindex.domain.popup.entity.PopupImage;
import com.drinkindex.domain.popup.entity.enums.PopupImageType;

public record UploadedPopupImageResponse(
        Long id,
        String imageUrl,
        String originalFileName,
        Long fileSize,
        String mimeType,
        PopupImageType imageType
) {
    public static UploadedPopupImageResponse from(PopupImage image) {
        return new UploadedPopupImageResponse(
                image.getId(),
                image.getImageUrl(),
                image.getOriginalFileName(),
                image.getFileSize(),
                image.getMimeType(),
                image.getImageType()
        );
    }
}
