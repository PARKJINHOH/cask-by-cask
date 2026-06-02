package com.drinkindex.domain.pricetracker.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectPriceReportRequest(
        @NotBlank @Size(max = 500) String rejectReason
) {}
