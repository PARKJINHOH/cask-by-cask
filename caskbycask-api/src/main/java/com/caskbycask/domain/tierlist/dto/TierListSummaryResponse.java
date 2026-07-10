package com.caskbycask.domain.tierlist.dto;

import java.time.LocalDateTime;

public record TierListSummaryResponse(
        Long id,
        String title,
        String description,
        String shareKey,
        Long itemCount,
        LocalDateTime updatedAt
) {
}
