package com.caskbycask.domain.pricetracker.dto.request;

import jakarta.validation.constraints.NotNull;

public record MergeStoreRequest(
        @NotNull Long targetStoreId
) {}
