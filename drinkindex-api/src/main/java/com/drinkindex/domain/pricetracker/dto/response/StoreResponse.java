package com.drinkindex.domain.pricetracker.dto.response;

import com.drinkindex.domain.pricetracker.entity.Store;
import com.drinkindex.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.drinkindex.domain.pricetracker.entity.enums.StoreType;

import java.time.LocalDateTime;

public record StoreResponse(
        Long id,
        String displayName,
        StoreType storeType,
        DutyFreeChannel dutyfreeChannel,
        String region,
        Boolean isApproved,
        Long createdById,
        String createdByNickname,
        LocalDateTime approvedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static StoreResponse from(Store store) {
        return new StoreResponse(
                store.getId(),
                store.getDisplayName(),
                store.getStoreType(),
                store.getDutyfreeChannel(),
                store.getRegion(),
                store.getIsApproved(),
                store.getCreatedBy() != null ? store.getCreatedBy().getId() : null,
                store.getCreatedBy() != null ? store.getCreatedBy().getNickname() : null,
                store.getApprovedAt(),
                store.getCreatedAt(),
                store.getUpdatedAt()
        );
    }
}
