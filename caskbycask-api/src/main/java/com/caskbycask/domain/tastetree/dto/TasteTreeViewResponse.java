package com.caskbycask.domain.tastetree.dto;

import com.caskbycask.domain.tastetree.entity.enums.TasteTreeModerationStatus;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeType;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeVersionStatus;

import java.time.LocalDateTime;

public record TasteTreeViewResponse(
        Long id,
        TasteTreeType type,
        String shareKey,
        String ownerNickname,
        boolean owner,
        boolean bookmarked,
        boolean likedByMe,
        boolean canLike,
        int likeCount,
        int viewCount,
        TasteTreeModerationStatus moderationStatus,
        Long versionId,
        Integer versionNumber,
        TasteTreeVersionStatus versionStatus,
        String title,
        String description,
        TasteTreeContent content,
        boolean hasDraft,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
