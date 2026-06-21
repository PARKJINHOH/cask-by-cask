package com.caskbycask.domain.pricetracker.dto.response;

import java.util.List;

public record ChartSeries(
        Long spiritId,
        List<ChartPoint> points
) {}
