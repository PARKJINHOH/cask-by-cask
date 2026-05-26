package com.drinkindex.domain.bottlecollection.dto;

import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;

import java.util.List;

public record BottleStatsDto(
    long totalCount,
    long totalPrice,
    long openedCount,
    long unopenedCount,
    List<CategoryStat> categoryStats
) {
    public record CategoryStat(SpiritCategory category, long count) {}
}
