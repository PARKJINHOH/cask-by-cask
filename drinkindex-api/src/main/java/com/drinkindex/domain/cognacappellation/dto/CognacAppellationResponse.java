package com.drinkindex.domain.cognacappellation.dto;

import com.drinkindex.domain.cognacappellation.entity.CognacAppellation;
import io.swagger.v3.oas.annotations.media.Schema;

public record CognacAppellationResponse(
        @Schema(description = "세부 산지 고유 ID") Long id,
        @Schema(description = "한글 산지명") String nameKo,
        @Schema(description = "영문 산지명") String nameEn,
        @Schema(description = "한글 소개") String descriptionKo,
        @Schema(description = "영문 소개") String descriptionEn
) {
    public static CognacAppellationResponse from(CognacAppellation appellation) {
        return new CognacAppellationResponse(
                appellation.getId(),
                appellation.getNameKo(),
                appellation.getNameEn(),
                appellation.getDescriptionKo(),
                appellation.getDescriptionEn()
        );
    }
}
