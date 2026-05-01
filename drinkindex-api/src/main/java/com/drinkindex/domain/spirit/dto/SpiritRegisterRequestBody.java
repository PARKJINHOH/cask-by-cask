package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record SpiritRegisterRequestBody(
        @NotBlank(message = "한글 이름은 필수입니다.") String nameKo,
        @NotBlank(message = "영문 이름은 필수입니다.") String nameEn,
        @NotNull(message = "카테고리는 필수입니다.") SpiritCategory category,
        Long distilleryId,
        String bottler,
        Integer bottledYear,
        Integer vintageYear,
        @DecimalMin(value = "0.0", message = "도수는 0.0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "도수는 100.0 이하이어야 합니다.")
        BigDecimal abv,
        Integer volumeMl,
        String country,
        String region,
        List<String> imageUrls
) {}
