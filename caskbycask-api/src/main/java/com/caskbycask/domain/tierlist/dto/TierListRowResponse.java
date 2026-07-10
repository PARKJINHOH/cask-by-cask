package com.caskbycask.domain.tierlist.dto;

import com.caskbycask.domain.tierlist.entity.TierListRow;

public record TierListRowResponse(
        Long id,
        String rowKey,
        String label,
        String color,
        Integer sortOrder
) {
    public static TierListRowResponse from(TierListRow row) {
        return new TierListRowResponse(
                row.getId(),
                String.valueOf(row.getId()),
                row.getLabel(),
                row.getColor(),
                row.getSortOrder()
        );
    }
}
