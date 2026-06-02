package com.drinkindex.domain.pricetracker.dto.request;

import com.drinkindex.domain.pricetracker.entity.enums.PriceReportReportReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreatePriceReportReportRequest(
        @NotNull PriceReportReportReason reason,
        @Size(max = 500) String reasonDetail
) {}
