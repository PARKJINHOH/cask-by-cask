package com.caskbycask.domain.pricetracker.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ApprovePriceReportRequest(
        Long storeId,  // 기타 제안 매장을 표준 매장으로 매핑 시 사용 (nullable)
        @Min(1) @Max(100000) Integer volumeMl
) {}
