package com.caskbycask.domain.tierlist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TierListRowRequest(
        @NotBlank
        @Size(max = 60)
        String rowKey,

        @NotBlank
        @Size(max = 50)
        String label,

        @NotBlank
        @Size(max = 20)
        String color,

        Integer sortOrder
) {
}
