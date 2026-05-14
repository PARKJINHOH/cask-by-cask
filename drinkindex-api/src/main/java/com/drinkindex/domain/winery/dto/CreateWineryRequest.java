package com.drinkindex.domain.winery.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateWineryRequest(
        @Schema(description = "한글 와이너리명")
        @NotBlank(message = "한국어 와이너리명을 입력해주세요.")
        @Size(max = 200)
        String nameKo,

        @Schema(description = "영문 와이너리명")
        @NotBlank(message = "영문 와이너리명을 입력해주세요.")
        @Size(max = 200)
        String nameEn,

        @Schema(description = "소재 국가")
        @NotBlank(message = "국가를 입력해주세요.")
        @Size(max = 100)
        String country,

        @Schema(description = "소재 지역 (선택)")
        @Size(max = 100)
        String region,

        @Schema(description = "공식 웹사이트 URL (선택)")
        @Size(max = 500)
        String website,

        @Schema(description = "설립연도 (선택)")
        Integer foundedYear,

        @Schema(description = "한글 소개 (선택)")
        String descriptionKo,

        @Schema(description = "영문 소개 (선택)")
        String descriptionEn
) {}
