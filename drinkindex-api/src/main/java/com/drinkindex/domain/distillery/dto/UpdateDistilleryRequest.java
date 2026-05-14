package com.drinkindex.domain.distillery.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record UpdateDistilleryRequest(
        @Schema(description = "한글 증류소명 (null이면 변경 안 함)")
        @Size(min = 1, max = 200, message = "증류소명은 1자 이상 200자 이하로 입력해주세요.")
        String nameKo,

        @Schema(description = "영문 증류소명 (null이면 변경 안 함)")
        @Size(min = 1, max = 200, message = "증류소명은 1자 이상 200자 이하로 입력해주세요.")
        String nameEn,

        @Schema(description = "소재 국가 (null이면 변경 안 함)")
        @Size(min = 1, max = 100, message = "국가명은 1자 이상 100자 이하로 입력해주세요.")
        String country,

        @Schema(description = "소재 지역 (null이면 변경 안 함)")
        @Size(max = 100, message = "지역명은 100자 이하로 입력해주세요.")
        String region,

        @Schema(description = "공식 웹사이트 URL (null이면 변경 안 함)")
        @Size(max = 500, message = "웹사이트 URL은 500자 이하로 입력해주세요.")
        String website,

        @Schema(description = "설립연도 (null이면 변경 안 함)")
        Integer foundedYear,

        @Schema(description = "한글 소개 (null이면 변경 안 함)")
        String descriptionKo,

        @Schema(description = "영문 소개 (null이면 변경 안 함)")
        String descriptionEn
) {}
