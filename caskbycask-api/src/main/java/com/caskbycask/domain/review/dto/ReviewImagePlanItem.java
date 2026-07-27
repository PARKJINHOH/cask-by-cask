package com.caskbycask.domain.review.dto;

import jakarta.validation.constraints.PositiveOrZero;

public record ReviewImagePlanItem(
        Long imageId,
        @PositiveOrZero Integer fileIndex
) {}
