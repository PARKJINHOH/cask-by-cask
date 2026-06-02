package com.drinkindex.domain.pricetracker.dto.response;

import com.drinkindex.domain.pricetracker.entity.Store;
import com.drinkindex.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.drinkindex.domain.pricetracker.entity.enums.StoreType;

public record StoreSearchResponse(
        Long id,
        String displayName,
        StoreType storeType,
        DutyFreeChannel dutyfreeChannel
) {
    public static StoreSearchResponse from(Store store) {
        return new StoreSearchResponse(
                store.getId(),
                store.getDisplayName(),
                store.getStoreType(),
                store.getDutyfreeChannel()
        );
    }
}
