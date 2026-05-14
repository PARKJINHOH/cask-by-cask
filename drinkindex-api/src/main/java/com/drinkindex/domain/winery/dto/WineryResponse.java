package com.drinkindex.domain.winery.dto;

import com.drinkindex.domain.winery.entity.Winery;
import io.swagger.v3.oas.annotations.media.Schema;

public record WineryResponse(
        @Schema(description = "와이너리 고유 ID") Long id,
        @Schema(description = "한글 와이너리명") String nameKo,
        @Schema(description = "영문 와이너리명") String nameEn,
        @Schema(description = "소재 국가") String country,
        @Schema(description = "소재 지역") String region,
        @Schema(description = "공식 웹사이트 URL") String website,
        @Schema(description = "설립연도") Integer foundedYear,
        @Schema(description = "한글 소개") String descriptionKo,
        @Schema(description = "영문 소개") String descriptionEn
) {
    public static WineryResponse from(Winery winery) {
        return new WineryResponse(
                winery.getId(),
                winery.getNameKo(),
                winery.getNameEn(),
                winery.getCountry(),
                winery.getRegion(),
                winery.getWebsite(),
                winery.getFoundedYear(),
                winery.getDescriptionKo(),
                winery.getDescriptionEn()
        );
    }
}
