package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import lombok.Builder;

@Builder
public record SpiritAutocompleteResponse(
        Long id,
        String nameKo,
        String nameEn,
        SpiritCategory category,
        String imageUrl
) {}
