package com.drinkindex.domain.cognachouse.dto;

import com.drinkindex.domain.cognachouse.entity.CognacHouse;
import io.swagger.v3.oas.annotations.media.Schema;

public record CognacHouseResponse(
        @Schema(description = "꼬냑 하우스 고유 ID") Long id,
        @Schema(description = "한글 꼬냑 하우스명") String nameKo,
        @Schema(description = "영문 꼬냑 하우스명") String nameEn,
        @Schema(description = "소재 국가") String country,
        @Schema(description = "소재 지역") String region,
        @Schema(description = "공식 웹사이트 URL") String website,
        @Schema(description = "설립연도") Integer foundedYear,
        @Schema(description = "한글 소개") String descriptionKo,
        @Schema(description = "영문 소개") String descriptionEn
) {
    public static CognacHouseResponse from(CognacHouse cognacHouse) {
        return new CognacHouseResponse(
                cognacHouse.getId(),
                cognacHouse.getNameKo(),
                cognacHouse.getNameEn(),
                cognacHouse.getCountry(),
                cognacHouse.getRegion(),
                cognacHouse.getWebsite(),
                cognacHouse.getFoundedYear(),
                cognacHouse.getDescriptionKo(),
                cognacHouse.getDescriptionEn()
        );
    }
}
