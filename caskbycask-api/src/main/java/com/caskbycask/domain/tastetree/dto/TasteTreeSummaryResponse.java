package com.caskbycask.domain.tastetree.dto;

import com.caskbycask.domain.tastetree.entity.enums.TasteTreeType;

import java.time.LocalDateTime;

public record TasteTreeSummaryResponse(
        Long id,
        TasteTreeType type,
        String shareKey,
        String ownerNickname,
        String title,
        String description,
        String experienceLevel,
        Integer publishedVersion,
        boolean bookmarked,
        boolean hasDraft,
        LocalDateTime updatedAt
) {}
