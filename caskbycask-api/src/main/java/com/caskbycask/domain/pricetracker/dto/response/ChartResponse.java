package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.enums.BucketType;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;

import java.util.List;
import java.util.Map;

/**
 * @param storeTypeCounts 국내/해외/면세 각각에 등록된 가격 건수. storeType 필터만 제외하고
 *                        기간·용량 조건은 그대로 적용하므로, "그 탭을 눌렀을 때 실제로 보일 건수"와 일치한다.
 */
public record ChartResponse(
        BucketType bucketType,
        PriceCurrency currency,
        List<ChartPoint> points,
        List<ChartSeries> series,
        Map<StoreType, Long> storeTypeCounts
) {
    public ChartResponse(BucketType bucketType, PriceCurrency currency, List<ChartPoint> points) {
        this(bucketType, currency, points, List.of(), Map.of());
    }
}
