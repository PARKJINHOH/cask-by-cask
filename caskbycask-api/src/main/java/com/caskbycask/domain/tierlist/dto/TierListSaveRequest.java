package com.caskbycask.domain.tierlist.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record TierListSaveRequest(
        @NotBlank
        @Size(max = 100)
        String title,

        @Size(max = 1000)
        String description,

        @NotEmpty
        List<@Valid TierListRowRequest> rows,

        List<@Valid TierListItemRequest> items
) {
}
