package com.caskbycask.domain.photocard.dto;

import com.caskbycask.domain.photocard.entity.PhotoCardTemplate;
import com.caskbycask.domain.photocard.entity.enums.PhotoCardModerationStatus;
import com.caskbycask.domain.photocard.entity.enums.PhotoCardTemplateType;

import java.time.LocalDateTime;

/** 템플릿 상세 — 레이아웃 JSON 을 파싱한 객체로 함께 내려준다. */
public record PhotoCardTemplateResponse(
        Long id,
        PhotoCardTemplateType templateType,
        String name,
        String description,
        String aspectRatio,
        Integer schemaVersion,
        PhotoCardLayout layout,
        String thumbnailUrl,
        Boolean isPublic,
        PhotoCardModerationStatus moderationStatus,
        Integer displayOrder,
        Long useCount,
        Long ownerId,
        String ownerNickname,
        Boolean isMine,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static PhotoCardTemplateResponse of(PhotoCardTemplate template, PhotoCardLayout layout,
                                               Long viewerUserId) {
        return new PhotoCardTemplateResponse(
                template.getId(),
                template.getTemplateType(),
                template.getName(),
                template.getDescription(),
                template.getAspectRatio(),
                template.getSchemaVersion(),
                layout,
                template.getThumbnailUrl(),
                template.getIsPublic(),
                template.getModerationStatus(),
                template.getDisplayOrder(),
                template.getUseCount(),
                template.getOwner() != null ? template.getOwner().getId() : null,
                template.getOwner() != null ? template.getOwner().getNickname() : null,
                viewerUserId != null && template.isOwnedBy(viewerUserId),
                template.getCreatedAt(),
                template.getUpdatedAt()
        );
    }
}
