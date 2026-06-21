package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.enums.BucketType;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;

import java.util.List;

public record ChartResponse(
        BucketType bucketType,
        PriceCurrency currency,
        List<ChartPoint> points,
        List<ChartSeries> series
) {
    public ChartResponse(BucketType bucketType, PriceCurrency currency, List<ChartPoint> points) {
        this(bucketType, currency, points, List.of());
    }
}
