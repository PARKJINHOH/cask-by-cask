package com.drinkindex.domain.banner.dto;

import com.drinkindex.domain.banner.entity.BannerImage;
import com.drinkindex.domain.banner.entity.enums.BannerImageType;

public record UploadedBannerImageResponse(
        Long id,
        String imageUrl,
        String originalFileName,
        Long fileSize,
        String mimeType,
        BannerImageType imageType
) {
    public static UploadedBannerImageResponse from(BannerImage image) {
        return new UploadedBannerImageResponse(
                image.getId(),
                image.getImageUrl(),
                image.getOriginalFileName(),
                image.getFileSize(),
                image.getMimeType(),
                image.getImageType()
        );
    }
}
