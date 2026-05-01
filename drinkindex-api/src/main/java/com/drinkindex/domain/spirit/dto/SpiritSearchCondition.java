package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritSort;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;

import java.math.BigDecimal;

public record SpiritSearchCondition(
        String keyword,
        SpiritCategory category,
        String country,
        BigDecimal minAbv,
        BigDecimal maxAbv,
        BigDecimal minScore,
        BigDecimal maxScore,
        SpiritStatus status,
        SpiritSort sort
) {
    public SpiritSearchCondition {
        if (status == null) status = SpiritStatus.ACTIVE;
        if (sort == null) sort = SpiritSort.LATEST;
    }
}
