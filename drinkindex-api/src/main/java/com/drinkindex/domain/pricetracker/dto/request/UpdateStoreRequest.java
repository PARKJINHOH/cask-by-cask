package com.drinkindex.domain.pricetracker.dto.request;

import com.drinkindex.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.drinkindex.domain.pricetracker.entity.enums.StoreType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateStoreRequest(
        @NotBlank @Size(max = 255) String displayName,
        @NotNull StoreType storeType,
        DutyFreeChannel dutyfreeChannel,
        @Size(max = 100) String region
) {}
