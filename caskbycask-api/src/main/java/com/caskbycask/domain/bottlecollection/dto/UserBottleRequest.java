package com.caskbycask.domain.bottlecollection.dto;

import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UserBottleRequest(
    Long spiritId,
    String spiritNameText,
    @NotNull SpiritCategory category,
    @NotNull LocalDate purchaseDate,
    String batch,
    String bottlingYear,
    @NotNull @Min(0) Integer price,
    @NotBlank String store,
    @NotNull BottleStatus status,
    Boolean isPublic,
    String memo
) {}
