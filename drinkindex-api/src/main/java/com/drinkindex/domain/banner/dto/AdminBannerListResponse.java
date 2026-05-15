package com.drinkindex.domain.banner.dto;

import com.drinkindex.domain.banner.entity.Banner;
import com.drinkindex.domain.banner.entity.enums.BannerLanguage;
import com.drinkindex.domain.banner.entity.enums.BannerType;

import java.time.LocalDateTime;

public record AdminBannerListResponse(
        Long id,
        String adminTitle,
        BannerType bannerType,
        BannerLanguage language,
        Boolean isVisible,
        Integer sortOrder,
        Boolean isAlwaysVisible,
        LocalDateTime startAt,
        LocalDateTime endAt,
        LocalDateTime createdAt
) {
    public static AdminBannerListResponse from(Banner banner) {
        return new AdminBannerListResponse(
                banner.getId(),
                banner.getAdminTitle(),
                banner.getBannerType(),
                banner.getLanguage(),
                banner.getIsVisible(),
                banner.getSortOrder(),
                banner.getIsAlwaysVisible(),
                banner.getStartAt(),
                banner.getEndAt(),
                banner.getCreatedAt()
        );
    }
}
