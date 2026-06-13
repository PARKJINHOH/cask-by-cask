package com.caskbycask.domain.pricetracker.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ChartPoint(
        LocalDate date,
        BigDecimal minFinalPrice,    // 밴드 하단 = 최저 실구매가 = 라인
        BigDecimal maxPrice,         // 밴드 상단 = 최고 정가/행사가
        BigDecimal avgSalePrice,
        int storeCount,
        List<Long> reportIds
) {}
