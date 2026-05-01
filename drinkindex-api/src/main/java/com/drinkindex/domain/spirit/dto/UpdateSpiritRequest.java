package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

public record UpdateSpiritRequest(
        String nameKo,
        String nameEn,
        SpiritCategory category,
        Long distilleryId,
        String bottler,
        Integer bottledYear,
        Integer vintageYear,
        @DecimalMin(value = "0.0", message = "도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "도수는 100.0 이하이어야 합니다.")
        BigDecimal abv,
        Integer volumeMl,
        String country,
        String region
) {}
