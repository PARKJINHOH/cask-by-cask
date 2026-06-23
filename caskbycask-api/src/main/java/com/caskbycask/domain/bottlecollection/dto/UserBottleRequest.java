package com.caskbycask.domain.bottlecollection.dto;

import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UserBottleRequest(
    Long spiritId,
    @Size(max = 200) String spiritNameText,
    @NotNull SpiritCategory category,
    @NotNull LocalDate purchaseDate,
    @Size(max = 100) String batch,
    @Size(max = 100) String bottlingYear,
    @NotNull @Min(0) Integer price,
    @NotBlank @Size(max = 200) String store,
    @NotNull BottleStatus status,
    Boolean isPublic,
    String memo
) {}
