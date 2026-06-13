package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.StoreAlias;

public record StoreAliasResponse(
        Long id,
        String alias
) {
    public static StoreAliasResponse from(StoreAlias storeAlias) {
        return new StoreAliasResponse(storeAlias.getId(), storeAlias.getAlias());
    }
}
