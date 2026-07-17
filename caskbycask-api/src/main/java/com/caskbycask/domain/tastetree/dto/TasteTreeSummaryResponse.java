package com.caskbycask.domain.tastetree.dto;

import com.caskbycask.domain.tastetree.entity.enums.TasteTreeModerationStatus;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeType;

import java.time.LocalDateTime;

public record TasteTreeSummaryResponse(
        Long id,
        TasteTreeType type,
        String shareKey,
        String ownerNickname,
        String title,
        String description,
        Integer publishedVersion,
        boolean bookmarked,
        boolean likedByMe,
        boolean canLike,
        int likeCount,
        int viewCount,
        TasteTreeModerationStatus moderationStatus,
        boolean hasDraft,
        LocalDateTime updatedAt
) {}
