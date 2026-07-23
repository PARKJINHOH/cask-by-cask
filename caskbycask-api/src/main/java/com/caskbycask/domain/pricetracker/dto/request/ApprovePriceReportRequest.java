package com.caskbycask.domain.pricetracker.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ApprovePriceReportRequest(
        // 구버전 관리자 화면의 요청 호환용이며 서버에서는 무시한다.
        Long storeId,
        @Min(1) @Max(100000) Integer volumeMl
) {}
