package com.caskbycask.domain.banner.dto;

import com.caskbycask.domain.banner.entity.Banner;
import com.caskbycask.domain.banner.entity.BannerImage;
import com.caskbycask.domain.banner.entity.enums.BannerLanguage;
import com.caskbycask.domain.banner.entity.enums.BannerPosition;
import com.caskbycask.domain.banner.entity.enums.BannerType;

public record BannerResponse(
        Long id,
        BannerType bannerType,
        BannerPosition position,
        BannerLanguage language,
        // [보안] XSS: HTML형만 포함. content 원본 절대 미반환.
        String contentSanitized,
        BannerImageInfo pcImage,
        BannerImageInfo moImage,
        String linkUrl,
        Boolean linkTargetBlank,
        Integer sortOrder
) {
    public record BannerImageInfo(String imageUrl, String originalFileName) {
        public static BannerImageInfo from(BannerImage image) {
            return new BannerImageInfo(image.getImageUrl(), image.getOriginalFileName());
        }
    }

    public static BannerResponse from(Banner banner, BannerImage pcImage, BannerImage moImage) {
        return new BannerResponse(
                banner.getId(),
                banner.getBannerType(),
                banner.getPosition(),
                banner.getLanguage(),
                BannerType.HTML.equals(banner.getBannerType()) ? banner.getContentSanitized() : null,
                pcImage != null ? BannerImageInfo.from(pcImage) : null,
                moImage != null ? BannerImageInfo.from(moImage) : null,
                BannerType.IMAGE.equals(banner.getBannerType()) ? banner.getLinkUrl() : null,
                BannerType.IMAGE.equals(banner.getBannerType()) ? banner.getLinkTargetBlank() : null,
                banner.getSortOrder()
        );
    }
}
