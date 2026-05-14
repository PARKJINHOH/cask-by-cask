package com.drinkindex.domain.distillery.dto;

import com.drinkindex.domain.distillery.entity.Distillery;
import io.swagger.v3.oas.annotations.media.Schema;

public record DistilleryResponse(
        @Schema(description = "증류소 고유 ID")
        Long id,
        @Schema(description = "한글 증류소명")
        String nameKo,
        @Schema(description = "영문 증류소명")
        String nameEn,
        @Schema(description = "소재 국가")
        String country,
        @Schema(description = "소재 지역")
        String region,
        @Schema(description = "공식 웹사이트 URL")
        String website
) {
    public static DistilleryResponse from(Distillery distillery) {
        return new DistilleryResponse(
                distillery.getId(),
                distillery.getNameKo(),
                distillery.getNameEn(),
                distillery.getCountry(),
                distillery.getRegion(),
                distillery.getWebsite()
        );
    }
}
