package com.caskbycask.domain.bottlecollection.dto;

import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UserBottleRequest(
    Long spiritId,
    @Size(max = 200) String spiritNameText,
    @NotNull SpiritCategory category,
    LocalDate purchaseDate,
    @Size(max = 100) String batch,
    @Size(max = 100) String bottlingYear,
    @Min(0) Integer price,
    @Size(max = 200) String store,
    @Min(1) @Max(100000) Integer volumeMl,
    @NotNull BottleStatus status,
    Boolean isPublic,
    String memo
) {}
