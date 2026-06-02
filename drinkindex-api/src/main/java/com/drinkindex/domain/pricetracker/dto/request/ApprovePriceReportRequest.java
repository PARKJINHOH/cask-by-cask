package com.drinkindex.domain.pricetracker.dto.request;

public record ApprovePriceReportRequest(
        Long storeId  // 기타 제안 매장을 표준 매장으로 매핑 시 사용 (nullable)
) {}
