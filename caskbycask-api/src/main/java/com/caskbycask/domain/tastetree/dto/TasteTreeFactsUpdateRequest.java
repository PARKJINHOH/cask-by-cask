package com.caskbycask.domain.tastetree.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record TasteTreeFactsUpdateRequest(
        @NotNull @Size(max = 70)
        List<@NotBlank @Size(max = 160) String> factsKo
) {}
