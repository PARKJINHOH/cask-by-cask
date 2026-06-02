package com.drinkindex.domain.producer.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectProducerRequestRequest(
        @NotBlank String rejectReason
) {}
