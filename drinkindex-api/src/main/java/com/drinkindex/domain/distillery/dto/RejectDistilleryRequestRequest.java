package com.drinkindex.domain.distillery.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectDistilleryRequestRequest(
        @NotBlank String rejectReason
) {}
