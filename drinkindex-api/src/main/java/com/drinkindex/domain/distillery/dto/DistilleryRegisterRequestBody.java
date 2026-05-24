package com.drinkindex.domain.distillery.dto;

import jakarta.validation.constraints.NotBlank;

public record DistilleryRegisterRequestBody(
        @NotBlank String nameKo,
        @NotBlank String nameEn,
        @NotBlank String country,
        String region
) {}
