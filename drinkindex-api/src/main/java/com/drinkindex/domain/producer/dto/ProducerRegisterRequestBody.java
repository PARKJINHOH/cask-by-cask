package com.drinkindex.domain.producer.dto;

import com.drinkindex.domain.producer.entity.ProducerType;
import jakarta.validation.constraints.NotBlank;

public record ProducerRegisterRequestBody(
        @NotBlank String nameKo,
        @NotBlank String nameEn,
        @NotBlank String country,
        String region,
        ProducerType type
) {}
