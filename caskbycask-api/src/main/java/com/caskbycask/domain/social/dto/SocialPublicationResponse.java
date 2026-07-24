package com.caskbycask.domain.social.dto;

import com.caskbycask.domain.social.entity.SocialPublication;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;

import java.time.LocalDateTime;

public record SocialPublicationResponse(
        Long id,
        Long bundleId,
        SocialPlatform platform,
        SocialPublicationStatus status,
        SocialSourceType sourceType,
        Long sourceId,
        String permalink,
        String renderedImageUrl,
        String lastError,
        boolean canRetry,
        LocalDateTime publishedAt,
        LocalDateTime createdAt
) {
    public static SocialPublicationResponse from(SocialPublication publication) {
        var bundle = publication.getBundle();
        return new SocialPublicationResponse(
                publication.getId(),
                bundle.getId(),
                publication.getPlatform(),
                publication.getStatus(),
                bundle.getContentType() != null ? bundle.getContentType() : bundle.getOriginType(),
                bundle.getContentId() != null ? bundle.getContentId() : bundle.getOriginId(),
                publication.getPermalink(),
                publication.getImageUrlSnapshot() != null
                        ? publication.getImageUrlSnapshot() : bundle.getRenderedImageUrl(),
                publication.getLastErrorMessage(),
                publication.canRetry(),
                publication.getPublishedAt(),
                publication.getCreatedAt()
        );
    }
}
