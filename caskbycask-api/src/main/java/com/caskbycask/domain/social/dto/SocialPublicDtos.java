package com.caskbycask.domain.social.dto;

import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;

import java.time.LocalDateTime;
import java.util.List;

public final class SocialPublicDtos {
    private SocialPublicDtos() {}

    public record HubItem(
            Long bundleId,
            SocialSourceType sourceType,
            Long sourceId,
            String title,
            String imageUrl,
            String sourcePath,
            List<PlatformLink> platforms,
            LocalDateTime publishedAt
    ) {}

    public record PlatformLink(SocialPlatform platform, String permalink) {}
}
