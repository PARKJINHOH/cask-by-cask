package com.caskbycask.domain.tastetree.dto;

import com.caskbycask.domain.tastetree.dto.TasteTreeContent.ResultItemType;

import java.math.BigDecimal;

public record TasteTreeResultItemSnapshot(
        ResultItemType type,
        Long spiritId,
        String nameKo,
        String nameEn,
        String imageUrl,
        String canonicalPathKo,
        String canonicalPathEn,
        BigDecimal priceAmount,
        String currencyCode,
        Integer matchScore,
        String recommendationReasonKo,
        String recommendationReasonEn
) {}
