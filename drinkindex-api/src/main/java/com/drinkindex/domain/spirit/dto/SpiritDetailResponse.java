package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SpiritDetailResponse(
        Long id,
        String nameKo,
        String nameEn,
        SpiritCategory category,
        Long distilleryId,
        String distilleryNameKo,
        String distilleryNameEn,
        String bottler,
        Integer bottledYear,
        Integer vintageYear,
        BigDecimal abv,
        Integer volumeMl,
        String country,
        String region,
        BigDecimal avgScore,
        Integer reviewCount,
        SpiritStatus status,
        List<SpiritImageResponse> images,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static SpiritDetailResponse of(Spirit spirit, List<SpiritImageResponse> images) {
        return new SpiritDetailResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory(),
                spirit.getDistillery() != null ? spirit.getDistillery().getId() : null,
                spirit.getDistillery() != null ? spirit.getDistillery().getNameKo() : null,
                spirit.getDistillery() != null ? spirit.getDistillery().getNameEn() : null,
                spirit.getBottler(),
                spirit.getBottledYear(),
                spirit.getVintageYear(),
                spirit.getAbv(),
                spirit.getVolumeMl(),
                spirit.getCountry(),
                spirit.getRegion(),
                spirit.getAvgScore(),
                spirit.getReviewCount(),
                spirit.getStatus(),
                images,
                spirit.getCreatedAt(),
                spirit.getUpdatedAt()
        );
    }
}
