package com.drinkindex.domain.distillery.dto;

import com.drinkindex.domain.distillery.entity.Distillery;

public record DistilleryResponse(
        Long id,
        String nameKo,
        String nameEn,
        String country,
        String region
) {
    public static DistilleryResponse from(Distillery distillery) {
        return new DistilleryResponse(
                distillery.getId(),
                distillery.getNameKo(),
                distillery.getNameEn(),
                distillery.getCountry(),
                distillery.getRegion()
        );
    }
}
