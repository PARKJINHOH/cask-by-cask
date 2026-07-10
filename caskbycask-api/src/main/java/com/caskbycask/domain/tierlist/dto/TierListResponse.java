package com.caskbycask.domain.tierlist.dto;

import com.caskbycask.domain.tierlist.entity.TierList;

import java.time.LocalDateTime;
import java.util.List;

public record TierListResponse(
        Long id,
        String title,
        String description,
        String shareKey,
        String ownerNickname,
        boolean owner,
        List<TierListRowResponse> rows,
        List<TierListItemResponse> items,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static TierListResponse of(
            TierList tierList,
            List<TierListRowResponse> rows,
            List<TierListItemResponse> items,
            boolean owner
    ) {
        return new TierListResponse(
                tierList.getId(),
                tierList.getTitle(),
                tierList.getDescription(),
                tierList.getShareKey(),
                tierList.getUser().getNickname(),
                owner,
                rows,
                items,
                tierList.getCreatedAt(),
                tierList.getUpdatedAt()
        );
    }
}
