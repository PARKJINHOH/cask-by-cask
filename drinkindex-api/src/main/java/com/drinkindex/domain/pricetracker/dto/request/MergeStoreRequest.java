package com.drinkindex.domain.pricetracker.dto.request;

import jakarta.validation.constraints.NotNull;

public record MergeStoreRequest(
        @NotNull Long targetStoreId
) {}
