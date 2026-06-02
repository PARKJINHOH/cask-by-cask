package com.drinkindex.domain.pricetracker.dto.response;

import com.drinkindex.domain.pricetracker.entity.enums.BucketType;
import com.drinkindex.domain.pricetracker.entity.enums.PriceCurrency;

import java.util.List;

public record ChartResponse(
        BucketType bucketType,
        PriceCurrency currency,
        List<ChartPoint> points
) {}
