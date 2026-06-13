package com.caskbycask.domain.banner.dto;

import com.caskbycask.domain.banner.entity.Banner;
import com.caskbycask.domain.banner.entity.BannerImage;
import com.caskbycask.domain.banner.entity.enums.BannerLanguage;
import com.caskbycask.domain.banner.entity.enums.BannerType;

import java.time.LocalDateTime;

public record AdminBannerDetailResponse(
        Long id,
        String adminTitle,
        BannerType bannerType,
        BannerLanguage language,
        // [보안] 관리자 전용: TipTap 에디터 편집을 위해 원본 content 포함.
        String content,
        String contentSanitized,
        String linkUrl,
        Boolean linkTargetBlank,
        Boolean isVisible,
        Integer sortOrder,
        Boolean isAlwaysVisible,
        LocalDateTime startAt,
        LocalDateTime endAt,
        BannerResponse.BannerImageInfo pcImage,
        BannerResponse.BannerImageInfo moImage,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static AdminBannerDetailResponse from(Banner banner, BannerImage pcImage, BannerImage moImage) {
        return new AdminBannerDetailResponse(
                banner.getId(),
                banner.getAdminTitle(),
                banner.getBannerType(),
                banner.getLanguage(),
                banner.getContent(),
                banner.getContentSanitized(),
                banner.getLinkUrl(),
                banner.getLinkTargetBlank(),
                banner.getIsVisible(),
                banner.getSortOrder(),
                banner.getIsAlwaysVisible(),
                banner.getStartAt(),
                banner.getEndAt(),
                pcImage != null ? BannerResponse.BannerImageInfo.from(pcImage) : null,
                moImage != null ? BannerResponse.BannerImageInfo.from(moImage) : null,
                banner.getCreatedAt(),
                banner.getUpdatedAt()
        );
    }
}
