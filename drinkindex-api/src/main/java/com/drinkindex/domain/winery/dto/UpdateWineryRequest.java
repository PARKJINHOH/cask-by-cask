package com.drinkindex.domain.winery.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record UpdateWineryRequest(
        @Schema(description = "한글 와이너리명 (null이면 변경 안 함)")
        @Size(min = 1, max = 200)
        String nameKo,

        @Schema(description = "영문 와이너리명 (null이면 변경 안 함)")
        @Size(min = 1, max = 200)
        String nameEn,

        @Schema(description = "소재 국가 (null이면 변경 안 함)")
        @Size(min = 1, max = 100)
        String country,

        @Schema(description = "소재 지역 (null이면 변경 안 함)")
        @Size(max = 100)
        String region,

        @Schema(description = "공식 웹사이트 URL (null이면 변경 안 함)")
        @Size(max = 500)
        String website,

        @Schema(description = "설립연도 (null이면 변경 안 함)")
        Integer foundedYear,

        @Schema(description = "한글 소개 (null이면 변경 안 함)")
        String descriptionKo,

        @Schema(description = "영문 소개 (null이면 변경 안 함)")
        String descriptionEn
) {}
