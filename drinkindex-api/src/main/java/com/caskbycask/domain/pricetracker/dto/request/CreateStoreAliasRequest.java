package com.caskbycask.domain.pricetracker.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateStoreAliasRequest(
        @NotBlank @Size(max = 200) String alias
) {}
